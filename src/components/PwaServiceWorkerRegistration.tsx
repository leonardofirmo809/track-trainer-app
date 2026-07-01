import { useEffect } from "react";

// Registers the service worker on the client after page load.
// Fails silently — SW is a progressive enhancement, not a requirement.
export function PwaServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }, []);
  return null;
}
