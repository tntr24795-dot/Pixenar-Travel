/**
 * types/google-maps.d.ts
 * ---------------------------------------------------------------
 * The Google Maps JS API is loaded via a plain <script> tag (see
 * lib/google/load-maps-script.ts), not the @types/google.maps npm
 * package -- so TypeScript doesn't know about `window.google` on
 * its own. This gives it just enough of a type surface (loosely
 * typed as `any`) to compile, without adding a new dependency.
 * ---------------------------------------------------------------
 */
declare namespace google {
  namespace maps {
    class Map {
      constructor(el: HTMLElement, options: Record<string, unknown>);
    }
    namespace marker {
      class AdvancedMarkerElement {
        constructor(options: Record<string, unknown>);
        map: unknown;
      }
    }
  }
}

interface Window {
  google?: typeof google;
}
