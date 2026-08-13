import type { SerializedPasskeyCredential } from '@/utils/webauthn-authenticator';

export const WEBAUTHN_REQUEST = 'gcp-auth-skip:webauthn-request';
export const WEBAUTHN_RESPONSE = 'gcp-auth-skip:webauthn-response';
export const CLOSE_TAB_MESSAGE = 'gcp-auth-skip:close-tab';
export const PASSKEY_STATUS_MESSAGE = 'gcp-auth-skip:passkey-status';
export const PASSKEY_ARM_MESSAGE = 'gcp-auth-skip:passkey-arm';
export const PASSKEY_DISARM_MESSAGE = 'gcp-auth-skip:passkey-disarm';
export const PASSKEY_DELETE_MESSAGE = 'gcp-auth-skip:passkey-delete';
export const PASSKEY_HAS_MESSAGE = 'gcp-auth-skip:passkey-has';

export interface SerializedPublicKeyCredentialDescriptor {
  type: string;
  id: string;
}

export interface SerializedCreateRequest {
  origin: string;
  cloudSdk: boolean;
  rpId?: string;
  challenge: string;
  userId: string;
  userName: string;
}

export interface SerializedGetRequest {
  origin: string;
  cloudSdk: boolean;
  rpId?: string;
  challenge: string;
  allowCredentials: SerializedPublicKeyCredentialDescriptor[];
}

export type WebAuthnPageRequest =
  | { id: string; op: 'create'; request: SerializedCreateRequest }
  | { id: string; op: 'get'; request: SerializedGetRequest };

export type WebAuthnPageResponse =
  | { id: string; passthrough: true }
  | { id: string; passthrough: false; credential: SerializedPasskeyCredential }
  | { id: string; passthrough: false; error: string; name: string };

export type ExtensionMessage =
  | { type: typeof CLOSE_TAB_MESSAGE }
  | { type: typeof WEBAUTHN_REQUEST; payload: WebAuthnPageRequest }
  | { type: typeof PASSKEY_STATUS_MESSAGE }
  | { type: typeof PASSKEY_ARM_MESSAGE }
  | { type: typeof PASSKEY_DISARM_MESSAGE }
  | { type: typeof PASSKEY_DELETE_MESSAGE }
  | { type: typeof PASSKEY_HAS_MESSAGE };
