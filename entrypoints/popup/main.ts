import './style.css';
import { getSettings, saveSettings } from '@/utils/settings';

const autoLogin = requireElement('#autoLogin', HTMLInputElement);
const accountEmail = requireElement('#accountEmail', HTMLInputElement);
const accountPassword = requireElement('#accountPassword', HTMLInputElement);
const totpSecret = requireElement('#totpSecret', HTMLInputElement);
const status = requireElement('#status', HTMLParagraphElement);

let saveTimer: ReturnType<typeof setTimeout> | undefined;

void init();

async function init(): Promise<void> {
  const settings = await getSettings();
  autoLogin.checked = settings.autoLogin;
  accountEmail.value = settings.accountEmail;
  accountPassword.value = settings.accountPassword;
  totpSecret.value = settings.totpSecret;
  paintStatus();

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
