import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'GCP Auth Skip',
    description:
      'Fills Google Cloud SDK sign-in, including password, TOTP, and a local passkey.',
    permissions: ['storage'],
    host_permissions: [
      'https://accounts.google.com/*',
      'https://myaccount.google.com/*',
      'https://docs.cloud.google.com/sdk/auth_success*',
    ],
  },
});
