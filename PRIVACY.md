# Privacy Policy for GCP Auth Skip

Effective date: July 28, 2026

GCP Auth Skip does not collect, store, sell, or transmit personal information
or browsing data.

The extension runs locally in the browser. It reads visible page text on Google
Account pages only to identify a Google Cloud SDK authorization flow and locate
the account, Continue, or Allow control. It does not retain or transmit page
content, account identifiers, authentication information, or authorization
codes.

Users may optionally enter a preferred account email, password, and TOTP
authenticator secret in the extension popup, and may create a Google passkey
whose private key is stored only in Chrome's local extension storage. Those
values are used only to complete Google Account sign-in during a Google Cloud
SDK authorization flow (or, for passkey enrollment, on Google Account passkey
pages). The extension does not transmit them to the developer or any external
service. Existing Chrome, iCloud, or 1Password passkeys are not imported.

The extension also recognizes the exact Google Cloud SDK authentication-success
page and closes that tab after three seconds.

GCP Auth Skip contains no analytics, advertising, tracking, remotely hosted
code, or external network service.

GCP Auth Skip is an independent project and is not affiliated with, endorsed by,
or produced by Google.
