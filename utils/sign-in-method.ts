export type SignInMethod = 'password' | 'passkey' | undefined;

export function chooseSignInMethod(
  passwordAvailable: boolean,
  passkeyAvailable: boolean,
): SignInMethod {
  if (passwordAvailable) return 'password';
  if (passkeyAvailable) return 'passkey';
  return undefined;
}
