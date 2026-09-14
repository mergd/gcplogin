# GCP Auth Skip

## What it does

On a Google Cloud SDK or Google Auth Library OAuth page, the extension finishes
sign-in without waiting for clicks: it fills the configured email, password,
and authenticator code, selects the account, and clicks **Continue** / **Allow**.

It supports both `gcloud auth login` (including `--update-adc`) and
`gcloud auth application-default login`.

Google's password option always takes priority on the password/passkey choice
screen, including when a local passkey is enrolled or the password will be
supplied outside the extension. A locally enrolled passkey is used only when
Google does not offer the password choice and no password is configured.

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
