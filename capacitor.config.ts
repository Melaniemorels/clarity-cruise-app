import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Optional live-reload / remote URL for `npx cap run`.
 * If unset, the native shell loads bundled assets from `webDir` only (recommended for production).
 * Example: CAPACITOR_SERVER_URL=http://192.168.1.10:8080 npx cap sync
 */
const liveServerUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.lovable.2403b5514f3e489baaa7676aaa31ddf3',
  appName: 'clarity-cruise-app',
  webDir: 'dist',
  ...(liveServerUrl
    ? { server: { url: liveServerUrl, cleartext: true } }
    : {}),
};

export default config;
