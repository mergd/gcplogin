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
    if (location.href.startsWith(AUTH_SUCCESS_URL)) {
      const removeBadge = showAutomationBadge();
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await browser.runtime.sendMessage({ type: CLOSE_TAB_MESSAGE }).catch(() => {
        removeBadge();
      });
      return;
    }

    let removeBadge: (() => void) | undefined;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (CLOUD_SDK.test(document.body?.innerText ?? '')) {
        removeBadge ??= showAutomationBadge();

        const account = findVisible<HTMLElement>('[data-identifier]');
        if (account) {
          account.click();
          removeBadge();
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
          removeBadge();
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    removeBadge?.();
  },
});

function showAutomationBadge(): () => void {
  const host = document.createElement('div');
  host.setAttribute('data-gcp-auth-skip', 'active');
  host.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'width:36px',
    'height:36px',
    'z-index:2147483647',
    'pointer-events:none',
  ].join(';');

  const shadow = host.attachShadow({ mode: 'closed' });
  const image = document.createElement('img');
  image.src = browser.runtime.getURL('/icon/32.png');
  image.alt = 'GCP Auth Skip is active';
  image.width = 32;
  image.height = 32;
  image.style.cssText = [
    'display:block',
    'width:32px',
    'height:32px',
    'padding:2px',
    'border-radius:9px',
    'background:#fff',
    'box-shadow:0 2px 10px rgba(0,0,0,.18)',
  ].join(';');
  shadow.append(image);
  document.documentElement.append(host);

  return () => host.remove();
}

function findVisible<T extends HTMLElement>(selector: string): T | undefined {
  return [...document.querySelectorAll<T>(selector)].find(isVisible);
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}
