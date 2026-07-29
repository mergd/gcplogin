import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'GCP Auth Skip',
    description:
      'Clicks through the Google Cloud SDK account and consent screens.',
    permissions: ['storage'],
    host_permissions: [
      'https://accounts.google.com/*',
      'https://docs.cloud.google.com/sdk/auth_success*',
    ],
  },
});
