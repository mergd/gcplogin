const CLOSE_TAB_MESSAGE = 'gcp-auth-skip:close-tab';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (
      message?.type === CLOSE_TAB_MESSAGE &&
      sender.tab?.url?.startsWith(
        'https://docs.cloud.google.com/sdk/auth_success',
      ) &&
      sender.tab.id !== undefined
    ) {
      return browser.tabs.remove(sender.tab.id);
    }
  });
});
