import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollTriggerRegistered = false;
function ensureScrollTriggerRegistered() {
  if (!scrollTriggerRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    scrollTriggerRegistered = true;
  }
}

export interface ScrollRigTargets {
  /** Called with the smoothed 0..1 "flight progress" on every scroll-linked tick. */
  onProgress: (progress: number) => void;
  heroEl: Element;
  ctaEl: Element | null;
  scrub?: number;
}

/**
 * The "Scroll Cinema" layer: a single GSAP tween (tied to ScrollTrigger,
 * scrubbed for smoothing) that drives one continuous 0..1 "flight progress"
 * value across the whole homepage scroll -- from the top of the Hero section
 * to the bottom of the CTA section -- so the plane's takeoff reads as one
 * unbroken journey rather than several disjoint beats. `HeroScene`'s render
 * loop applies this value to the `Airplane` / `Runway` / `Sky` / camera each
 * frame. Kept as a plain class (not raw `.js` files) since this is a
 * React/Next app.
 */
export class ScrollRig {
  private trigger: ScrollTrigger | null = null;
  private readonly state = { value: 0 };

  constructor(private readonly targets: ScrollRigTargets) {
    ensureScrollTriggerRegistered();
    this.build();
  }

  private build() {
    const { onProgress, heroEl, ctaEl, scrub = 1.2 } = this.targets;

    const tween = gsap.to(this.state, {
      value: 1,
      ease: "none",
      onUpdate: () => onProgress(this.state.value),
      scrollTrigger: {
        trigger: heroEl,
        start: "top top",
        endTrigger: ctaEl ?? heroEl,
        end: ctaEl ? "bottom bottom" : "bottom top",
        scrub,
      },
    });

    if (tween.scrollTrigger) this.trigger = tween.scrollTrigger;
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  /** Kills the ScrollTrigger instance this rig created -- call from cleanup. */
  kill() {
    this.trigger?.kill();
    this.trigger = null;
  }
}
