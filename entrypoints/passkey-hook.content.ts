import { base64UrlToBytes, bytesToBase64Url, toBytes } from '@/utils/base64url';
import { isCloudSdkFlow } from '@/utils/google-signin';
import {
  WEBAUTHN_REQUEST,
  WEBAUTHN_RESPONSE,
  type SerializedCreateRequest,
  type SerializedGetRequest,
  type WebAuthnPageRequest,
  type WebAuthnPageResponse,
} from '@/utils/messages';
import type { SerializedPasskeyCredential } from '@/utils/webauthn-authenticator';

export default defineContentScript({
  matches: [
    'https://accounts.google.com/*',
    'https://myaccount.google.com/*',
  ],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const credentials = navigator.credentials;
    if (!credentials?.get || !credentials.create) return;

    const originalGet = credentials.get.bind(credentials);
    const originalCreate = credentials.create.bind(credentials);

    credentials.get = async (options) => {
      if (!options?.publicKey) return originalGet(options);
      const handled = await dispatch({
        id: crypto.randomUUID(),
        op: 'get',
        request: serializeGet(options),
      });
      if (handled.passthrough) return originalGet(options);
      if ('error' in handled) {
        throw new DOMException(handled.error, handled.name);
      }
      return inflateGet(handled.credential);
    };

    credentials.create = async (options) => {
      if (!options?.publicKey) return originalCreate(options);
      const handled = await dispatch({
        id: crypto.randomUUID(),
        op: 'create',
        request: serializeCreate(options),
      });
      if (handled.passthrough) return originalCreate(options);
      if ('error' in handled) {
        throw new DOMException(handled.error, handled.name);
      }
      return inflateCreate(handled.credential);
    };
  },
});

function serializeGet(options: CredentialRequestOptions): SerializedGetRequest {
  const publicKey = options.publicKey!;
  return {
    origin: location.origin,
    cloudSdk: isCloudSdkFlow(),
    rpId: publicKey.rpId,
    challenge: bytesToBase64Url(toBytes(publicKey.challenge)),
    allowCredentials: (publicKey.allowCredentials ?? []).map((item) => ({
      type: item.type,
      id: bytesToBase64Url(toBytes(item.id)),
    })),
  };
}

function serializeCreate(
  options: CredentialCreationOptions,
): SerializedCreateRequest {
  const publicKey = options.publicKey!;
  return {
    origin: location.origin,
    cloudSdk: isCloudSdkFlow(),
    rpId: publicKey.rp.id,
    challenge: bytesToBase64Url(toBytes(publicKey.challenge)),
    userId: bytesToBase64Url(toBytes(publicKey.user.id)),
    userName: publicKey.user.name,
  };
}

function dispatch(payload: WebAuthnPageRequest): Promise<WebAuthnPageResponse> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { type?: string } & WebAuthnPageResponse;
      if (data?.type !== WEBAUTHN_RESPONSE || data.id !== payload.id) return;
      window.removeEventListener('message', onMessage);
      resolve(data);
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ type: WEBAUTHN_REQUEST, ...payload }, location.origin);
    window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve({ id: payload.id, passthrough: true });
    }, 4_000);
  });
}

function inflateCreate(serialized: SerializedPasskeyCredential): PublicKeyCredential {
  const rawId = bufferFrom(serialized.rawId);
  const response = {
    clientDataJSON: bufferFrom(serialized.response.clientDataJSON),
    attestationObject: bufferFrom(serialized.response.attestationObject ?? ''),
    getPublicKey: () => bufferFrom(serialized.response.publicKey ?? ''),
    getPublicKeyAlgorithm: () => -7 as const,
    getTransports: () => serialized.response.transports,
    getAuthenticatorData: () =>
      bufferFrom(serialized.response.authenticatorData),
  };
  Object.setPrototypeOf(response, AuthenticatorAttestationResponse.prototype);
  return credential(serialized, rawId, response);
}

function inflateGet(serialized: SerializedPasskeyCredential): PublicKeyCredential {
  const rawId = bufferFrom(serialized.rawId);
  const response = {
    clientDataJSON: bufferFrom(serialized.response.clientDataJSON),
    authenticatorData: bufferFrom(serialized.response.authenticatorData),
    signature: bufferFrom(serialized.response.signature ?? ''),
    userHandle: serialized.response.userHandle
      ? bufferFrom(serialized.response.userHandle)
      : null,
  };
  Object.setPrototypeOf(response, AuthenticatorAssertionResponse.prototype);
  return credential(serialized, rawId, response);
}

function credential(
  serialized: SerializedPasskeyCredential,
  rawId: ArrayBuffer,
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse,
): PublicKeyCredential {
  const value = {
    id: serialized.id,
    rawId,
    type: 'public-key' as const,
    authenticatorAttachment: serialized.authenticatorAttachment,
    response,
    getClientExtensionResults: () => serialized.clientExtensionResults,
    toJSON: () => ({
          id: serialized.id,
          rawId: serialized.rawId,
          type: 'public-key',
          authenticatorAttachment: serialized.authenticatorAttachment,
          clientExtensionResults: serialized.clientExtensionResults,
          response: serialized.response,
        }),
  };
  Object.setPrototypeOf(value, PublicKeyCredential.prototype);
  return value as unknown as PublicKeyCredential;
}

function bufferFrom(value: string): ArrayBuffer {
  const bytes = base64UrlToBytes(value);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
