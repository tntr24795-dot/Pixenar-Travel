import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollRigOptions {
  heroEl: HTMLElement;
  ctaEl: HTMLElement | null;
  onProgress: (value: number) => void;
}

/**
 * Drives one smoothed 0..1 "flight progress" value across the entire
 * hero -> CTA scroll range, via a single continuous GSAP tween scrubbed by
 * ScrollTrigger. Kept intentionally simple (one tween, one callback) rather
 * than several independent triggers, so the runway/sky crossfade and the
 * camera dolly in HeroScene always stay perfectly in sync with each other.
 */
export class ScrollRig {
  private tween: gsap.core.Tween | null = null;
  private trigger: ScrollTrigger | null = null;

  constructor(private options: ScrollRigOptions) {
    this.build();
  }

  private build() {
    const { heroEl, ctaEl, onProgress } = this.options;
    const state = { value: 0 };

    this.tween = gsap.to(state, {
      value: 1,
      ease: "none",
      onUpdate: () => onProgress(state.value),
      scrollTrigger: {
        trigger: heroEl,
        start: "top top",
        endTrigger: ctaEl ?? heroEl,
        end: ctaEl ? "bottom bottom" : "bottom top",
        scrub: true,
      },
    });

    this.trigger = this.tween.scrollTrigger ?? null;
  }

  refresh() {
    this.trigger?.refresh();
  }

  kill() {
    this.tween?.kill();
    this.trigger?.kill();
    this.tween = null;
    this.trigger = null;
  }
}
