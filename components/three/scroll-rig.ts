import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SceneCamera } from "./camera";
import type { ParticleField } from "./particle-field";

let scrollTriggerRegistered = false;
function ensureScrollTriggerRegistered() {
  if (!scrollTriggerRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    scrollTriggerRegistered = true;
  }
}

export interface ScrollRigTargets {
  camera: SceneCamera;
  particles: ParticleField;
  /** Called as bloom should intensify/relax (driven by the Destinations beat). */
  onBloomChange: (strength: number) => void;
  heroEl: Element;
  destinationsEl: Element | null;
  ctaEl: Element | null;
  scrub?: number;
}

/**
 * The "Scroll Cinema" layer: GSAP timelines tied to ScrollTrigger, whose
 * progress drives the Three.js camera + particle/bloom intensity across the
 * homepage's three narrative beats (Hero -> Destinations reveal -> CTA).
 * Kept as a plain class (not raw `.js` files) since this is a React/Next app.
 */
export class ScrollRig {
  private triggers: ScrollTrigger[] = [];

  constructor(private readonly targets: ScrollRigTargets) {
    ensureScrollTriggerRegistered();
    this.build();
  }

  private build() {
    const { camera, particles, onBloomChange, heroEl, destinationsEl, ctaEl, scrub = 1.5 } = this.targets;
    const cam = camera.camera;

    // Beat 1 -- Hero: camera pulls back from darkness into the scene as the
    // hero section scrolls by.
    const heroTween = gsap.fromTo(
      cam.position,
      { x: 0, y: 2, z: 8 },
      {
        x: 0,
        y: 0.6,
        z: 3.2,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          scrub,
        },
      }
    );
    if (heroTween.scrollTrigger) this.triggers.push(heroTween.scrollTrigger);

    // Beat 2 -- Destinations reveal: camera dollies sideways as featured
    // listing cards animate in; bloom + particle intensity ramp up.
    if (destinationsEl) {
      const destinationsTween = gsap.to(cam.position, {
        x: -2.2,
        y: 1.2,
        z: 1,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: destinationsEl,
          start: "top bottom",
          end: "bottom center",
          scrub,
          onUpdate: (self) => {
            particles.intensity = 0.5 + self.progress * 0.6;
            onBloomChange(0.4 + self.progress * 1.1);
          },
        },
      });
      if (destinationsTween.scrollTrigger) this.triggers.push(destinationsTween.scrollTrigger);
    }

    // Beat 3 -- CTA: camera settles/locks as the "become a host" text fades in
    // (the fade itself is a plain DOM/GSAP tween owned by the page, not here).
    if (ctaEl) {
      const ctaTween = gsap.to(cam.position, {
        x: 0,
        y: 0.4,
        z: -0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ctaEl,
          start: "top bottom",
          end: "top center",
          scrub,
        },
      });
      if (ctaTween.scrollTrigger) this.triggers.push(ctaTween.scrollTrigger);
    }
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  /** Kills every ScrollTrigger instance this rig created -- call from cleanup. */
  kill() {
    this.triggers.forEach((trigger) => trigger.kill());
    this.triggers = [];
  }
}
