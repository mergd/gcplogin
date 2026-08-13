import {
  WEBAUTHN_REQUEST,
  WEBAUTHN_RESPONSE,
  type WebAuthnPageRequest,
} from '@/utils/messages';

export default defineContentScript({
  matches: [
    'https://accounts.google.com/*',
    'https://myaccount.google.com/*',
  ],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data as { type?: string } & WebAuthnPageRequest;
      if (data?.type !== WEBAUTHN_REQUEST || !data.id || !data.op) return;

      void browser.runtime
        .sendMessage({
          type: WEBAUTHN_REQUEST,
          payload: { id: data.id, op: data.op, request: data.request },
        })
        .then((response) => {
          window.postMessage(
            { type: WEBAUTHN_RESPONSE, ...response },
            location.origin,
          );
        })
        .catch(() => {
          window.postMessage(
            { type: WEBAUTHN_RESPONSE, id: data.id, passthrough: true },
            location.origin,
          );
        });
    });
  },
});
