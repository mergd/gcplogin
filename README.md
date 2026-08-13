# GCP Auth Skip

## What it does

On a Google Cloud SDK OAuth page, the extension finishes sign-in without
waiting for clicks: it fills the configured email, password, and authenticator
code, selects the account, and clicks **Continue** / **Allow**.

If a local passkey is enrolled, Cloud SDK login uses that instead of Touch ID.
Otherwise, a saved password skips passkey screens in favor of password + TOTP.

While the flow runs, a small badge appears in the corner so you can see it
is active. It does not observe or modify unrelated page rendering.

The Cloud SDK authentication-success tab closes after three seconds.

## Auto-login profile

Open the extension popup to:

- Turn auto-login on or off.
- Enter the exact Google account email to select or type on the identifier page.
- Optionally store a password for Google's password challenge.
- Optionally store a Google Authenticator TOTP secret (base32 or `otpauth://` URL).
- Set up a Google passkey stored in this Chrome profile (this is a new passkey,
  not an import from 1Password or iCloud).
- Leave the email blank to use the first visible account.

The preference is stored only in this Chrome profile.

## Develop

```bash
npm install
npm run dev
```

WXT opens a browser with the extension loaded.

## Load manually

```bash
npm run build
```

Then Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.
