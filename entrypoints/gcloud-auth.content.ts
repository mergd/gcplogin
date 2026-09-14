import { showAutomationBadge } from '@/utils/automation-badge';
import {
  fillInput,
  findAccount,
  findConsentAction,
  findCreatePasskeyAction,
  findEmailInput,
  findIdentifierNext,
  findPasskeyAction,
  findPasswordFallback,
  findPasswordMethod,
  findPasswordInput,
  findPasswordNext,
  findTotpFallback,
  findTotpInput,
  findTotpNext,
  isCloudSdkFlow,
} from '@/utils/google-signin';
import {
  CLOSE_TAB_MESSAGE,
  PASSKEY_STATUS_MESSAGE,
} from '@/utils/messages';
import { getSettings, type Settings } from '@/utils/settings';
import { chooseSignInMethod } from '@/utils/sign-in-method';
import { generateTotp, TOTP_PERIOD_SECONDS } from '@/utils/totp';

const FALLBACK_SCAN_MS = 1_000;
const ACTION_SETTLE_MS = 900;
const AUTH_SUCCESS_URL = 'https://docs.cloud.google.com/sdk/auth_success';

export default defineContentScript({
  matches: [
    'https://accounts.google.com/*',
    'https://myaccount.google.com/*',
    'https://docs.cloud.google.com/sdk/auth_success*',
  ],
  runAt: 'document_idle',
  async main() {
    const [settings, passkeyStatus] = await Promise.all([
      getSettings(),
      browser.runtime
        .sendMessage({ type: PASSKEY_STATUS_MESSAGE })
        .then((value) => ({
          enrolled: Boolean(value?.enrolled),
          enrollArmed: Boolean(value?.enrollArmed),
        }))
        .catch(() => ({ enrolled: false, enrollArmed: false })),
    ]);

    if (location.href.startsWith(AUTH_SUCCESS_URL)) {
      if (!settings.autoLogin) return;
      showAutomationBadge();
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await browser.runtime
        .sendMessage({ type: CLOSE_TAB_MESSAGE })
        .catch(() => undefined);
      return;
    }

    let busyUntil = 0;
    const enrollArmed = passkeyStatus.enrollArmed;
    let running = false;
    let rerunRequested = false;

    const advance = async () => {
      if (running) {
        rerunRequested = true;
        return;
      }

      running = true;
      try {
        if (enrollArmed) {
          showAutomationBadge();
          const create = findCreatePasskeyAction();
          if (create && Date.now() >= busyUntil) {
            create.click();
            busyUntil = Date.now() + ACTION_SETTLE_MS;
          }
        }

        if (settings.autoLogin && isCloudSdkFlow()) {
          showAutomationBadge();
          if (
            Date.now() >= busyUntil &&
            (await advanceSignIn(settings, passkeyStatus.enrolled))
          ) {
            busyUntil = Date.now() + ACTION_SETTLE_MS;
          }
        }
      } finally {
        running = false;
        if (rerunRequested) {
          rerunRequested = false;
          void advance();
        }
      }
    };

    const observer = new MutationObserver(() => {
      void advance();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const fallbackScan = window.setInterval(() => {
      void advance();
    }, FALLBACK_SCAN_MS);

    window.addEventListener(
      'pagehide',
      () => {
        observer.disconnect();
        window.clearInterval(fallbackScan);
      },
      { once: true },
    );

    await advance();
  },
});

async function advanceSignIn(
  settings: Settings,
  hasPasskey: boolean,
): Promise<boolean> {
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

  if (!email) {
    const passwordMethod = findPasswordMethod();
    const passkey =
      hasPasskey && !settings.accountPassword
        ? findPasskeyAction()
        : undefined;
    const method = chooseSignInMethod(
      Boolean(passwordMethod),
      Boolean(passkey),
    );

    if (method === 'password') {
      passwordMethod!.click();
      return true;
    }

    if (method === 'passkey') {
      passkey!.click();
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

  if (settings.accountPassword && !password) {
    const fallback = findPasswordFallback(true);
    if (fallback) {
      fallback.click();
      return true;
    }
  }

  if (hasPasskey && !settings.accountPassword) {
    const passkey = findPasskeyAction();
    if (passkey) {
      passkey.click();
      return true;
    }
  }

  const consent = findConsentAction();
  if (consent && !email && !password) {
    consent.click();
    return true;
  }

  // Account chips also carry data-identifier on challenge and consent pages.
  // Keep generic account selection behind the page-specific actions above.
  const account = findAccount(settings.accountEmail);
  if (account) {
    account.click();
    return true;
  }

  return false;
}
