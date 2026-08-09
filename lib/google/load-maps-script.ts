/**
 * lib/google/load-maps-script.ts
 * ---------------------------------------------------------------
 * Loads the Google Maps JavaScript API (plus the `marker` library,
 * needed for AdvancedMarkerElement -- the custom-HTML-pin API) by
 * injecting the official <script> tag once, then resolving when
 * `window.google.maps` is ready. Deliberately avoids adding an npm
 * package (e.g. @googlemaps/js-api-loader) so this doesn't require
 * a fresh `npm install` step -- the script tag is the same thing
 * Google's own docs recommend, just done manually.
 * ---------------------------------------------------------------
 */

let loaderPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMapsScript can only run in the browser."));
  }

  if ((window as any).google?.maps?.marker) {
    return Promise.resolve();
  }

  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "true";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
