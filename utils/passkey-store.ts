import type { StoredGooglePasskey } from '@/utils/webauthn-authenticator';

const PASSKEY_KEY = 'googlePasskey';
const ENROLL_KEY = 'passkeyEnrollArmed';

export async function getStoredPasskey(): Promise<StoredGooglePasskey | undefined> {
  const stored = await browser.storage.local.get(PASSKEY_KEY);
  const value = stored[PASSKEY_KEY];
  if (!value || typeof value !== 'object') return undefined;
  return value as StoredGooglePasskey;
}

export async function saveStoredPasskey(
  passkey: StoredGooglePasskey,
): Promise<void> {
  await browser.storage.local.set({ [PASSKEY_KEY]: passkey });
}

export async function deleteStoredPasskey(): Promise<void> {
  await browser.storage.local.remove(PASSKEY_KEY);
}

export async function isPasskeyEnrollArmed(): Promise<boolean> {
  const stored = await browser.storage.local.get({ [ENROLL_KEY]: false });
  return Boolean(stored[ENROLL_KEY]);
}

export async function setPasskeyEnrollArmed(armed: boolean): Promise<void> {
  await browser.storage.local.set({ [ENROLL_KEY]: armed });
}

export async function getPasskeyStatus(): Promise<{
  enrolled: boolean;
  userName: string;
  enrollArmed: boolean;
}> {
  const [passkey, enrollArmed] = await Promise.all([
    getStoredPasskey(),
    isPasskeyEnrollArmed(),
  ]);
  return {
    enrolled: Boolean(passkey),
    userName: passkey?.userName ?? '',
    enrollArmed,
  };
}
