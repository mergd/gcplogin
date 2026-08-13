const CLOUD_SDK = /Google Cloud SDK/i;
const CLOUD_SDK_CLIENT = '32555940559';
const FLOW_FLAG = 'gcp-auth-skip-flow';

const NEXT = /^(next|continuer|siguiente|weiter|avançar|продолжить)$/i;
const PASSKEY_ACTION = /^(continue|try again)$/i;
const TRY_ANOTHER_WAY = /try another way/i;
const PASSWORD_METHOD = /^(enter your password|use your password)$/i;
const TOTP_METHOD =
  /google authenticator|authenticator app|verification code from/i;
const PASSKEY_METHOD = /use (your )?passkey|sign in with (a )?passkey|passkey/i;
const SKIP_LABELS = /create a passkey|not now|skip|cancel|dismiss/i;

export function isCloudSdkFlow(): boolean {
  try {
    if (sessionStorage.getItem(FLOW_FLAG) === '1') return true;
  } catch {
    // sessionStorage can throw in some locked contexts
  }

  const marked =
    location.href.includes(CLOUD_SDK_CLIENT) ||
    CLOUD_SDK.test(document.body?.innerText ?? '');

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
  const labeled = findButtonByLabel(PASSKEY_METHOD);
  if (labeled && !SKIP_LABELS.test(labeled.innerText)) return labeled;

  if (!/passkey/i.test(document.body?.innerText ?? '')) return undefined;

  return findButtonByLabel(PASSKEY_ACTION);
}

export function findPasswordFallback(preferPassword = false): HTMLElement | undefined {
  const passwordMethod = findClickableByLabel(PASSWORD_METHOD);
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
  return [...document.querySelectorAll<HTMLElement>(
    'button, [role="button"], li, div[data-challengetype]',
  )].find((element) => {
    if (!isVisible(element)) return false;
    const label = element.innerText.trim();
    return pattern.test(label) && !SKIP_LABELS.test(label);
  });
}

export function hasPasskeyPrompt(): boolean {
  return /passkey/i.test(document.body?.innerText ?? '');
}
