export interface Settings {
  autoLogin: boolean;
  accountEmail: string;
  accountPassword: string;
  totpSecret: string;
}

export const DEFAULT_SETTINGS: Settings = {
  autoLogin: true,
  accountEmail: '',
  accountPassword: '',
  totpSecret: '',
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get({ ...DEFAULT_SETTINGS });

  return {
    autoLogin: Boolean(stored.autoLogin),
    accountEmail: String(stored.accountEmail ?? '').trim().toLowerCase(),
    accountPassword: String(stored.accountPassword ?? ''),
    totpSecret: String(stored.totpSecret ?? '').trim(),
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({
    autoLogin: settings.autoLogin,
    accountEmail: settings.accountEmail.trim().toLowerCase(),
    accountPassword: settings.accountPassword,
    totpSecret: settings.totpSecret.trim(),
  });
}
