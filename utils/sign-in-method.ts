export type SignInMethod = 'password' | 'passkey' | undefined;

export function chooseSignInMethod(
  passwordAvailable: boolean,
  passkeyAvailable: boolean,
): SignInMethod {
  if (passwordAvailable) return 'password';
  if (passkeyAvailable) return 'passkey';
  return undefined;
}

export function clickTargetPriority(
  tagName: string,
  role: string | null,
  hasChallengeType: boolean,
): number {
  if (hasChallengeType) return 0;
  if (tagName === 'BUTTON') return 0;
  if (role === 'button' || role === 'link' || role === 'option') return 0;
  return 1;
}
