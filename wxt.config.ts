import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'GCP Auth Skip',
    description:
      'Fills Google Cloud SDK sign-in, including password and authenticator codes.',
    permissions: ['storage'],
    host_permissions: [
      'https://accounts.google.com/*',
      'https://docs.cloud.google.com/sdk/auth_success*',
    ],
  },
});
