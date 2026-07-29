export interface Settings {
  autoLogin: boolean;
  accountEmail: string;
}

export const DEFAULT_SETTINGS: Settings = {
  autoLogin: true,
  accountEmail: '',
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get({ ...DEFAULT_SETTINGS });

  return {
    autoLogin: Boolean(stored.autoLogin),
    accountEmail: String(stored.accountEmail ?? '').trim().toLowerCase(),
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({
    autoLogin: settings.autoLogin,
    accountEmail: settings.accountEmail.trim().toLowerCase(),
  });
}
