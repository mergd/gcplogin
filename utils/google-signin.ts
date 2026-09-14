import {
  clickTargetPriority,
  isAccountChooserUrl,
} from '@/utils/sign-in-method';

const CLOUD_SDK = /Google Cloud SDK|Google Auth Library/i;
export const CLOUD_SDK_CLIENTS = [
  '32555940559',
  '764086051850',
] as const;
const FLOW_FLAG = 'gcp-auth-skip-flow';

const NEXT = /^(next|continuer|siguiente|weiter|avançar|продолжить)$/i;
const PASSKEY_ACTION = /^(continue|try again)$/i;
const TRY_ANOTHER_WAY = /try another way/i;
const PASSWORD_METHOD = /enter your password|use your password/i;
const TOTP_METHOD =
  /google authenticator|authenticator app|verification code from/i;
const PASSKEY_CHOICE = /use your passkey|sign in with (a )?passkey/i;
const PASSKEY_METHOD = /use (your )?passkey|sign in with (a )?passkey|passkey/i;
const SKIP_LABELS = /create a passkey|not now|skip|cancel|dismiss/i;

export function isCloudSdkUrl(url = location.href): boolean {
  return CLOUD_SDK_CLIENTS.some((client) => url.includes(client));
}

export function isCloudSdkFlow(): boolean {
  try {
    if (sessionStorage.getItem(FLOW_FLAG) === '1') return true;
  } catch {
    // sessionStorage can throw in some locked contexts
  }

  const marked =
    isCloudSdkUrl() || CLOUD_SDK.test(document.body?.innerText ?? '');

  if (marked) {
    try {
      sessionStorage.setItem(FLOW_FLAG, '1');
    } catch {
      // ignore
    }
  }

  return marked;
}

export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}

export function findAccount(accountEmail: string): HTMLElement | undefined {
  if (!isAccountChooserUrl(location.href)) return undefined;

  const accounts = [...document.querySelectorAll<HTMLElement>(
    '[data-identifier]',
  )].filter(isVisible);

  if (!accountEmail) return accounts[0];

  return (
    accounts.find(
      (account) =>
        account.getAttribute('data-identifier')?.trim().toLowerCase() ===
        accountEmail,
    ) ?? accounts[0]
  );
}

export function findEmailInput(): HTMLInputElement | undefined {
  return findVisibleInput(
    '#identifierId, input[type="email"], input[name="identifier"]',
  );
}

export function findPasswordInput(): HTMLInputElement | undefined {
  return findVisibleInput(
    'input[name="Passwd"], input[type="password"]',
  );
}

export function fillInput(input: HTMLInputElement, value: string): void {
  input.focus();
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function findIdentifierNext(): HTMLElement | undefined {
  return (
    findNestedButton('#identifierNext') ?? findButtonByLabel(NEXT)
  );
}

export function findPasswordNext(): HTMLElement | undefined {
  return findNestedButton('#passwordNext') ?? findButtonByLabel(NEXT);
}

export function findTotpInput(): HTMLInputElement | undefined {
  const named = findVisibleInput('#totpPin, input[name="totpPin"]');
  if (named) return named;

  const body = document.body?.innerText ?? '';
  if (!/authenticator|verification code|6-digit|6 digit/i.test(body)) {
    return undefined;
  }

  return [...document.querySelectorAll<HTMLInputElement>(
    'input[autocomplete="one-time-code"], input[maxlength="6"]',
  )].find(
    (input) =>
      isVisible(input) &&
      input.type !== 'password' &&
      input.type !== 'email' &&
      !input.disabled,
  );
}

export function findTotpNext(): HTMLElement | undefined {
  return findNestedButton('#totpNext') ?? findButtonByLabel(NEXT);
}

export function findConsentAction(): HTMLElement | undefined {
  return findButtonByLabel(/^(allow|continue)$/i);
}

export function findPasskeyAction(): HTMLElement | undefined {
  const choice = findClickableByLabel(PASSKEY_CHOICE);
  if (choice) return choice;

  const labeled = findButtonByLabel(PASSKEY_METHOD);
  if (labeled && !SKIP_LABELS.test(labeled.innerText)) return labeled;

  if (!/passkey/i.test(document.body?.innerText ?? '')) return undefined;

  return findButtonByLabel(PASSKEY_ACTION);
}

export function findPasswordMethod(): HTMLElement | undefined {
  const passwordChallenge = [
    ...document.querySelectorAll<HTMLElement>('[data-challengetype="1"]'),
  ].find(isVisible);
  if (passwordChallenge) return passwordChallenge;

  return findClickableByLabel(PASSWORD_METHOD);
}

export function findCreatePasskeyAction(): HTMLElement | undefined {
  return findClickableByLabel(/^(create a passkey|add a passkey|create passkey)$/i)
    ?? findClickableByLabel(/create a passkey|add a passkey/i);
}

export function findPasswordFallback(preferPassword = false): HTMLElement | undefined {
  const passwordMethod = findPasswordMethod();
  if (passwordMethod) return passwordMethod;

  if (hasPasskeyPrompt() && !preferPassword) return undefined;

  return findButtonByLabel(TRY_ANOTHER_WAY);
}

export function findTotpFallback(): HTMLElement | undefined {
  const method = findClickableByLabel(TOTP_METHOD);
  if (method) return method;
  if (findTotpInput()) return undefined;
  return findButtonByLabel(TRY_ANOTHER_WAY);
}

function findVisibleInput(selector: string): HTMLInputElement | undefined {
  return [...document.querySelectorAll<HTMLInputElement>(selector)].find(
    (input) => isVisible(input) && !input.disabled,
  );
}

function findNestedButton(selector: string): HTMLElement | undefined {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return undefined;
  const button = host.matches('button, [role="button"]')
    ? host
    : host.querySelector<HTMLElement>('button, [role="button"]');
  return button && isVisible(button) ? button : undefined;
}

function findButtonByLabel(pattern: RegExp): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('button, [role="button"]')]
    .find((element) => {
      if (!isVisible(element)) return false;
      const label = element.innerText.trim();
      return pattern.test(label) && !SKIP_LABELS.test(label);
    });
}

function findClickableByLabel(pattern: RegExp): HTMLElement | undefined {
  const matches = [
    ...document.querySelectorAll<HTMLElement>(
      'button, [role="button"], [role="link"], [role="option"], li, div[data-challengetype]',
    ),
  ].filter((element) => {
    if (!isVisible(element)) return false;
    const label = element.innerText.replace(/\s+/g, ' ').trim();
    return (
      pattern.test(label) &&
      !SKIP_LABELS.test(label) &&
      label.length < 80
    );
  });

  return matches.sort((left, right) => {
    const priority =
      clickTargetPriority(
        left.tagName,
        left.getAttribute('role'),
        left.hasAttribute('data-challengetype'),
      ) -
      clickTargetPriority(
        right.tagName,
        right.getAttribute('role'),
        right.hasAttribute('data-challengetype'),
      );
    return priority || left.innerText.length - right.innerText.length;
  })[0];
}

export function hasPasskeyPrompt(): boolean {
  return /passkey/i.test(document.body?.innerText ?? '');
}
