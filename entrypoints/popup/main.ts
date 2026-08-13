import './style.css';
import {
  PASSKEY_ARM_MESSAGE,
  PASSKEY_DELETE_MESSAGE,
  PASSKEY_STATUS_MESSAGE,
} from '@/utils/messages';
import { getSettings, saveSettings } from '@/utils/settings';

const PASSKEYS_URL = 'https://myaccount.google.com/signinoptions/passkeys';

const autoLogin = requireElement('#autoLogin', HTMLInputElement);
const accountEmail = requireElement('#accountEmail', HTMLInputElement);
const accountPassword = requireElement('#accountPassword', HTMLInputElement);
const totpSecret = requireElement('#totpSecret', HTMLInputElement);
const status = requireElement('#status', HTMLParagraphElement);
const passkeyStatus = requireElement('#passkeyStatus', HTMLParagraphElement);
const armPasskey = requireElement('#armPasskey', HTMLButtonElement);
const removePasskey = requireElement('#removePasskey', HTMLButtonElement);

let saveTimer: ReturnType<typeof setTimeout> | undefined;

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  autoLogin.checked = settings.autoLogin;
  accountEmail.value = settings.accountEmail;
  accountPassword.value = settings.accountPassword;
  totpSecret.value = settings.totpSecret;
  paintStatus();
  await refreshPasskey();

  autoLogin.addEventListener('change', () => {
    paintStatus();
    void persist();
  });

  for (const field of [accountEmail, accountPassword, totpSecret]) {
    field.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => void persist(), 250);
    });
  }

  armPasskey.addEventListener('click', () => {
    void arm();
  });
  removePasskey.addEventListener('click', () => {
    void browser.runtime
      .sendMessage({ type: PASSKEY_DELETE_MESSAGE })
      .then(paintPasskey);
  });
}

function paintStatus(): void {
  status.textContent = autoLogin.checked ? 'Enabled' : 'Paused';
  document.body.dataset.enabled = String(autoLogin.checked);
}

async function persist(): Promise<void> {
  await saveSettings({
    autoLogin: autoLogin.checked,
    accountEmail: accountEmail.value,
    accountPassword: accountPassword.value,
    totpSecret: totpSecret.value,
  });
}

async function refreshPasskey(): Promise<void> {
  const result = await browser.runtime.sendMessage({
    type: PASSKEY_STATUS_MESSAGE,
  });
  paintPasskey(result);
}

function paintPasskey(result: {
  enrolled?: boolean;
  userName?: string;
  enrollArmed?: boolean;
}): void {
  removePasskey.hidden = !result.enrolled;
  if (result.enrollArmed) {
    passkeyStatus.textContent = 'Armed. Add a passkey on the Google page.';
    armPasskey.textContent = 'Open Google passkeys';
    return;
  }
  if (result.enrolled) {
    passkeyStatus.textContent = result.userName
      ? `Ready for ${result.userName}`
      : 'Ready for Cloud SDK login';
    armPasskey.textContent = 'Replace passkey';
    return;
  }
  passkeyStatus.textContent = 'Not set up';
  armPasskey.textContent = 'Set up passkey';
}

async function arm(): Promise<void> {
  await browser.runtime.sendMessage({ type: PASSKEY_ARM_MESSAGE });
  await refreshPasskey();
  await browser.tabs.create({ url: PASSKEYS_URL });
}

function requireElement<T extends Element>(
  selector: string,
  constructor: abstract new (...args: never[]) => T,
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing ${selector}`);
  }
  return element;
}
