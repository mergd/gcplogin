import { CLOUD_SDK_CLIENT } from '@/utils/google-signin';
import {
  CLOSE_TAB_MESSAGE,
  PASSKEY_ARM_MESSAGE,
  PASSKEY_DELETE_MESSAGE,
  PASSKEY_DISARM_MESSAGE,
  PASSKEY_HAS_MESSAGE,
  PASSKEY_STATUS_MESSAGE,
  WEBAUTHN_REQUEST,
  type ExtensionMessage,
  type SerializedCreateRequest,
  type SerializedGetRequest,
  type WebAuthnPageRequest,
  type WebAuthnPageResponse,
} from '@/utils/messages';
import {
  deleteStoredPasskey,
  getPasskeyStatus,
  getStoredPasskey,
  isPasskeyEnrollArmed,
  saveStoredPasskey,
  setPasskeyEnrollArmed,
} from '@/utils/passkey-store';
import {
  allowListIncludes,
  assertGooglePasskey,
  createGooglePasskey,
  isGoogleRpId,
} from '@/utils/webauthn-authenticator';

const GOOGLE_ORIGINS = new Set([
  'https://accounts.google.com',
  'https://myaccount.google.com',
]);

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
    switch (message.type) {
      case CLOSE_TAB_MESSAGE:
        if (
          sender.tab?.url?.startsWith(
            'https://docs.cloud.google.com/sdk/auth_success',
          ) &&
          sender.tab.id !== undefined
        ) {
          return browser.tabs.remove(sender.tab.id);
        }
        return undefined;
      case WEBAUTHN_REQUEST:
        return handleWebAuthn(message.payload, sender);
      case PASSKEY_STATUS_MESSAGE:
        return getPasskeyStatus();
      case PASSKEY_HAS_MESSAGE:
        return getStoredPasskey().then((passkey) => Boolean(passkey));
      case PASSKEY_ARM_MESSAGE:
        return setPasskeyEnrollArmed(true).then(() => getPasskeyStatus());
      case PASSKEY_DISARM_MESSAGE:
        return setPasskeyEnrollArmed(false).then(() => getPasskeyStatus());
      case PASSKEY_DELETE_MESSAGE:
        return deleteStoredPasskey()
          .then(() => setPasskeyEnrollArmed(false))
          .then(() => getPasskeyStatus());
      default: {
        const exhaustive: never = message;
        return exhaustive;
      }
    }
  });
});

async function handleWebAuthn(
  payload: WebAuthnPageRequest,
  sender: { origin?: string; tab?: { url?: string } },
): Promise<WebAuthnPageResponse> {
  const origin = sender.origin ?? payload.request.origin;
  if (!GOOGLE_ORIGINS.has(origin)) {
    return { id: payload.id, passthrough: true };
  }

  switch (payload.op) {
    case 'create':
      return handleCreate(payload.id, payload.request);
    case 'get':
      return handleGet(payload.id, payload.request, sender.tab?.url);
    default: {
      const exhaustive: never = payload;
      return exhaustive;
    }
  }
}

async function handleCreate(
  id: string,
  request: SerializedCreateRequest,
): Promise<WebAuthnPageResponse> {
  if (!(await isPasskeyEnrollArmed()) || !isGoogleRpId(request.rpId)) {
    return { id, passthrough: true };
  }

  try {
    const created = await createGooglePasskey({
      origin: request.origin,
      challenge: request.challenge,
      userId: request.userId,
      userName: request.userName,
    });
    await saveStoredPasskey(created.passkey);
    await setPasskeyEnrollArmed(false);
    return { id, passthrough: false, credential: created.credential };
  } catch (error) {
    return {
      id,
      passthrough: false,
      error: error instanceof Error ? error.message : 'Passkey create failed',
      name: 'NotAllowedError',
    };
  }
}

async function handleGet(
  id: string,
  request: SerializedGetRequest,
  tabUrl?: string,
): Promise<WebAuthnPageResponse> {
  const cloudSdk =
    request.cloudSdk || Boolean(tabUrl?.includes(CLOUD_SDK_CLIENT));
  const passkey = await getStoredPasskey();
  if (
    !cloudSdk ||
    !passkey ||
    !isGoogleRpId(request.rpId) ||
    !allowListIncludes(request.allowCredentials, passkey.credentialId)
  ) {
    return { id, passthrough: true };
  }

  try {
    const asserted = await assertGooglePasskey({
      origin: request.origin,
      challenge: request.challenge,
      passkey,
    });
    await saveStoredPasskey(asserted.passkey);
    return { id, passthrough: false, credential: asserted.credential };
  } catch (error) {
    return {
      id,
      passthrough: false,
      error: error instanceof Error ? error.message : 'Passkey get failed',
      name: 'NotAllowedError',
    };
  }
}
