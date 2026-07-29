import { showAutomationBadge } from '@/utils/automation-badge';
import { getSettings } from '@/utils/settings';

const CLOUD_SDK = /Google Cloud SDK/i;
const ACTION = /^(allow|continue)$/i;
const MAX_ATTEMPTS = 20;
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

    showAutomationBadge();

    if (location.href.startsWith(AUTH_SUCCESS_URL)) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await browser.runtime
        .sendMessage({ type: CLOSE_TAB_MESSAGE })
        .catch(() => undefined);
      return;
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (CLOUD_SDK.test(document.body?.innerText ?? '')) {
        const account = findAccount(settings.accountEmail);
        if (account) {
          account.click();
          return;
        }

        const action = [...document.querySelectorAll<HTMLElement>(
          'button, [role="button"]',
        )].find(
          (element) =>
            isVisible(element) && ACTION.test(element.innerText.trim()),
        );

        if (action) {
          action.click();
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  },
});

function findAccount(accountEmail: string): HTMLElement | undefined {
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

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}
