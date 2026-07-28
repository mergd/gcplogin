# Chrome Web Store listing

## Name

GCP Auth Skip

## Summary

Finishes Google Cloud CLI browser sign-in and closes the success tab without collecting or transmitting data.

## Category

Developer Tools

## Language

English

## Detailed description

GCP Auth Skip removes the repetitive browser steps from `gcloud auth login`.

When a Google Cloud SDK authorization page appears, the extension selects the
first visible Google account and clicks the visible Continue or Allow button.
After authentication succeeds, it closes the Cloud SDK success tab after three
seconds.

Features:

- Works only on Google Account pages for Google Cloud SDK authorization.
- Closes only the exact Google Cloud SDK authentication-success page.
- Injects no interface, ads, analytics, or tracking.
- Stores and transmits no user data.
- Uses no remotely hosted code.

The extension acts automatically while a Google Cloud SDK login is in progress.
Install it only if you want those account-selection and authorization controls
clicked for you.

GCP Auth Skip is an independent project and is not affiliated with, endorsed by,
or produced by Google.

## Single purpose

Complete the browser portion of Google Cloud CLI authentication and close its
success tab.

## Permission justifications

### `https://accounts.google.com/*`

Required to recognize Google Cloud SDK authorization pages and click the first
visible account or the visible Continue or Allow control. The extension takes
no action when the page does not identify itself as a Google Cloud SDK flow.

### `https://docs.cloud.google.com/sdk/auth_success*`

Required to recognize and close only the Google Cloud SDK authentication-success
tab three seconds after it loads.

## Privacy-practices answers

- Handles personally identifiable information: **No**
- Handles authentication information: **No**
- Handles personal communications: **No**
- Handles location, web history, user activity, or website content: **No**
- Collects or transmits user data: **No**
- Uses data for purposes unrelated to the single purpose: **No**
- Uses remotely hosted code: **No**
- Limited-use certification: **Yes**

The script reads visible page text locally only to determine whether the current
page belongs to the Google Cloud SDK authorization flow. It does not retain,
log, collect, or transmit that text.

## Required assets

- Store icon: `assets/store/icon-128.png`
- Small promotional tile: `assets/store/promo-440x280.png`
- Marquee image: `assets/store/marquee-1400x560.png`
- Screenshot: `assets/store/screenshot-1280x800.png`

All listing graphics are rendered deterministically from
`assets/source/store-artwork.html`.
