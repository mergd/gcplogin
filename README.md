# GCP Auth Skip

## What it does

On a Google Cloud SDK OAuth page, the extension clicks the first visible
account or the visible **Continue** / **Allow** button.

It injects no UI and does not observe or modify unrelated page rendering.

The Cloud SDK authentication-success tab closes after three seconds.

## Auto-login profile

Open the extension popup to:

- Turn auto-login on or off.
- Enter the exact Google account email to select.
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
