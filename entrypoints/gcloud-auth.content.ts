import { showAutomationBadge } from '@/utils/automation-badge';
import {
  fillInput,
  findAccount,
  findConsentAction,
  findEmailInput,
  findIdentifierNext,
  findPasskeyAction,
  findPasswordFallback,
  findPasswordInput,
  findPasswordNext,
  findTotpFallback,
  findTotpInput,
  findTotpNext,
  isCloudSdkFlow,
} from '@/utils/google-signin';
import { getSettings, type Settings } from '@/utils/settings';
import { generateTotp, TOTP_PERIOD_SECONDS } from '@/utils/totp';

const MAX_ATTEMPTS = 40;
const AUTH_SUCCESS_URL = 'https://docs.cloud.google.com/sdk/auth_success';
const CLOSE_TAB_MESSAGE = 'gcp-auth-skip:close-tab';

export default defineContentScript({
  matches: [
    'https://accounts.google.com/*',
    'https://docs.cloud.google.com/sdk/auth_success*',
  ],
  runAt: 'document_idle',
  async main() {
    const settings = await getSettings();
    if (!settings.autoLogin) return;

    if (location.href.startsWith(AUTH_SUCCESS_URL)) {
      showAutomationBadge();
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await browser.runtime
        .sendMessage({ type: CLOSE_TAB_MESSAGE })
        .catch(() => undefined);
      return;
    }

    let busyUntil = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (isCloudSdkFlow()) {
        showAutomationBadge();
        if (Date.now() >= busyUntil && (await advanceSignIn(settings))) {
          busyUntil = Date.now() + 900;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  },
});

async function advanceSignIn(settings: Settings): Promise<boolean> {
  const account = findAccount(settings.accountEmail);
  if (account) {
    account.click();
    return true;
  }

  const email = findEmailInput();
  if (email && settings.accountEmail) {
    if (email.value.trim().toLowerCase() !== settings.accountEmail) {
      fillInput(email, settings.accountEmail);
    }
    const next = findIdentifierNext();
    if (next) {
      next.click();
      return true;
    }
  }

  const password = findPasswordInput();
  if (password && settings.accountPassword) {
    if (password.value !== settings.accountPassword) {
      fillInput(password, settings.accountPassword);
    }
    const next = findPasswordNext();
    if (next) {
      next.click();
      return true;
    }
  }

  if (settings.totpSecret && !email && !password) {
    const totpInput = findTotpInput();
    if (totpInput) {
      const remaining =
        TOTP_PERIOD_SECONDS -
        (Math.floor(Date.now() / 1000) % TOTP_PERIOD_SECONDS);
      if (remaining <= 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, remaining * 1000 + 50),
        );
      }
      const code = await generateTotp(settings.totpSecret);
      if (code) {
        if (totpInput.value !== code) fillInput(totpInput, code);
        const next = findTotpNext();
        if (next) {
          next.click();
          return true;
        }
      }
    }

    const totpMethod = findTotpFallback();
    if (totpMethod) {
      totpMethod.click();
      return true;
    }
  }

  if (!settings.accountPassword) {
    const passkey = findPasskeyAction();
    if (passkey) {
      passkey.click();
      return true;
    }
  }

  if (settings.accountPassword && !password) {
    const fallback = findPasswordFallback(true);
    if (fallback) {
      fallback.click();
      return true;
    }
  }

  const consent = findConsentAction();
  if (consent && !email && !password) {
    consent.click();
    return true;
  }

  return false;
}
