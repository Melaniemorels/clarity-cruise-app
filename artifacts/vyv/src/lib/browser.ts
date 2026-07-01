import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * Opens a URL in an in-app browser when running as a native app,
 * or in a new tab when running as a web app.
 */
export const openInAppBrowser = async (url: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    // Native: opens in-app browser (SFSafariViewController on iOS, Chrome Custom Tabs on Android)
    await Browser.open({ url });
  } else {
    // Web fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Closes the in-app browser (only works on native platforms)
 */
export const closeInAppBrowser = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Browser.close();
  }
};
