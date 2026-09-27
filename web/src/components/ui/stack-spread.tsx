// Built using Hyperiux Vault: https://vault.hyperiux.com
// Adapted for Atlas Kedah: cards take any content (not only images), the
// headline/subtitle/hint are props (for BM/EN), colours default to site tokens,
// and the sticky stage can sit below a sticky site header.

"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll progress where the cluster starts scattering and where it finishes.
const SCATTER_START = 0.12;
const SCATTER_END = 0.9;

const PARALLAX_X = 2.6;
const PARALLAX_Y = 2.2;
const PARALLAX_SPRING = { stiffness: 90, damping: 22, mass: 0.6 };
const parallaxDepth = (i: number, total: number) =>
  total <= 1 ? 1 : 0.55 + (i / (total - 1)) * 0.75;

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    // Touch vs. mouse, not raw width: a narrow mouse-driven window keeps the
    // desktop scatter + pointer parallax; only touch devices use the grid layout.
    const mq = window.matchMedia("(pointer: coarse)");
    const read = () => setTouch(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return touch;
}

function usePointerParallax(active: boolean, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, PARALLAX_SPRING);
  const y = useSpring(rawY, PARALLAX_SPRING);

  useEffect(() => {
    if (!enabled) return;
    if (!active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }
    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth) * 2 - 1);
      rawY.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [active, enabled, rawX, rawY]);

  return { x, y };
}

export interface StackSpreadItem {
  /** Image card: provide src (+ alt). */
  src?: string;
  alt?: string;
  /** Or any content (rendered instead of the image). */
  content?: ReactNode;
}

export interface StackSpreadTarget {
  /** final offset from centre, in vw / vh */
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  /** card size, in vw / vh */
  w: number;
  h: number;
}

export interface StackSpreadCard {
  key: string;
  item: StackSpreadItem;
  target: StackSpreadTarget;
  /** final spot and size on touch devices; falls back to `target` */
  targetSm?: { x: number; y: number; w?: number; h?: number };
  /** angle while clustered */
  stackRotate?: number;
  /** offset while clustered (vw/vh) */
  stackOffset?: { x: number; y: number };
  /** paint order, higher on top */
  z?: number;
}

function Card({
  card,
  progress,
  reduce,
  clusterRotation,
  isSmall,
  stackScale,
  cardRadius,
  pointer,
  depth,
}: {
  card: StackSpreadCard;
  progress: MotionValue<number>;
  reduce: boolean | null;
  clusterRotation: boolean;
  isSmall: boolean;
  stackScale: number;
  cardRadius: number;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  depth: number;
}) {
  const { item, target } = card;
  const flat = reduce === true;
  const stackRotate = flat ? 0 : clusterRotation ? card.stackRotate ?? 0 : 0;
  const stackOffset = card.stackOffset ?? { x: 0, y: 0 };
  const restScale = target.scale ?? 1;

  const sm = isSmall && card.targetSm ? card.targetSm : null;
  const endX = sm ? sm.x : target.x;
  const endY = sm ? sm.y : target.y;
  const endRotate = flat || isSmall ? 0 : target.rotate;
  const w = sm?.w ?? target.w;
  const h = sm?.h ?? target.h;

  // -50% keeps the card centred on its anchor
  const translate = useTransform([progress, pointer.x, pointer.y], ([p, px, py]: number[]) => {
    const tx = stackOffset.x + (endX - stackOffset.x) * p;
    const ty = stackOffset.y + (endY - stackOffset.y) * p;
    const drift = depth * p;
    const dx = tx - px * PARALLAX_X * drift;
    const dy = ty - py * PARALLAX_Y * drift;
    return `calc(-50% + ${dx}cqw) calc(-50% + ${dy}vh)`;
  });
  const rotate = useTransform(progress, [0, 1], [stackRotate, endRotate]);
  const scale = useTransform(progress, [0, 1], [stackScale, restScale]);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 will-change-transform"
      style={{ width: `${w}cqw`, height: `${h}vh`, zIndex: card.z ?? 1, translate, rotate, scale }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: `${cardRadius}px` }}>
        {item.content ?? (
          // Static export: next/image optimisation is off, so a plain <img> is equivalent.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.src} alt={item.alt ?? ""} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
    </motion.div>
  );
}

export interface StackSpreadProps {
  cards: StackSpreadCard[];
  /** centre headline */
  headline: ReactNode;
  /** heading level for the headline (h1 when the spread opens the page) */
  headingAs?: "h1" | "h2";
  subtitle?: ReactNode;
  /** label for the scroll hint, e.g. "Tatal" / "Scroll"; omit to hide the hint */
  scrollHint?: string;
  /** scatter scroll distance, in vh */
  scrollLength?: number;
  bgColor?: string;
  textColor?: string;
  /** fan the clustered stack (default) or start flat */
  clusterRotation?: boolean;
  /** scale of the cards while clustered, before the scatter */
  stackScale?: number;
  /** corner radius on each card, in px */
  cardRadius?: number;
  /** scroll progress (0-1) where the centre text starts fading in */
  textFadeStart?: number;
  /** CSS length the sticky stage sits below (e.g. a sticky header's height) */
  stickyTop?: string;
  className?: string;
  id?: string;
}

export default function StackSpread({
  cards,
  headline,
  subtitle,
  scrollHint,
  scrollLength = 260,
  bgColor = "var(--page)",
  textColor = "var(--ink)",
  clusterRotation = true,
  stackScale = 0.82,
  cardRadius = 10,
  textFadeStart = 0.3,
  stickyTop = "0px",
  className,
  id,
  headingAs: Heading = "h1",
}: StackSpreadProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const isSmall = useIsTouch();

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });
  // hold, scatter, then settle
  const progress = useTransform(scrollYProgress, [0, SCATTER_START, SCATTER_END, 1], [0, 0, 1, 1]);

  const [spread, setSpread] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    setSpread((was) => (was ? p > 0.985 : p >= 0.999));
  });
  const parallaxEnabled = reduce !== true && !isSmall;
  const pointer = usePointerParallax(spread, parallaxEnabled);

  const noScale = reduce === true;
  const copyOpacity = useTransform(progress, [textFadeStart, textFadeStart + 0.35], [0, 1]);
  const copyScale = useTransform(progress, [textFadeStart, 0.9], [0.85, 1]);
  const hintOpacity = useTransform(progress, [0, SCATTER_START], [1, 0]);

  return (
    <section
      ref={wrapRef}
      id={id}
      className={`relative w-full ${className ?? ""}`}
      // positions and sizes are relative to this section's width (cqw), so the
      // spread fits beside a sidebar as well as full-width
      style={{ height: `${scrollLength}vh`, backgroundColor: bgColor, containerType: "inline-size" }}
    >
      <div
        className="sticky w-full overflow-hidden"
        style={{ top: stickyTop, height: `calc(100vh - ${stickyTop})` }}
      >
        {/* centre text */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center max-md:px-8"
          style={{ opacity: copyOpacity, scale: noScale ? 1 : copyScale }}
        >
          <Heading
            className="m-0 w-full text-[5.4cqw] font-normal leading-none! tracking-tight max-md:text-[11cqw]"
            style={{ color: textColor, fontFamily: "var(--serif)" }}
          >
            {headline}
          </Heading>
          {subtitle && (
            <p
              className="mt-[1.4cqw] mb-0 w-full max-w-[42ch] text-[1.5cqw] leading-relaxed tracking-tight max-md:mt-3 max-md:text-[3.8cqw]"
              style={{ color: textColor, opacity: 0.7 }}
            >
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* scattering cards */}
        <div className="absolute inset-0 z-10">
          {cards.map((card, i) => (
            <Card
              key={card.key}
              card={card}
              progress={progress}
              reduce={reduce}
              clusterRotation={clusterRotation}
              isSmall={isSmall}
              stackScale={stackScale}
              cardRadius={cardRadius}
              pointer={pointer}
              depth={parallaxEnabled ? parallaxDepth(i, cards.length) : 0}
            />
          ))}
        </div>

        {/* scroll hint */}
        {scrollHint && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-[3vh] z-20 flex flex-col items-center gap-[0.6vh] text-[0.95cqw] font-medium uppercase tracking-[0.2em] max-md:bottom-6 max-md:gap-1 max-md:text-[2.8cqw]"
            style={{ color: textColor, opacity: hintOpacity }}
          >
            <span>{scrollHint}</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className="animate-bounce max-md:h-[4cqw] max-md:w-[4cqw]" aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </motion.div>
        )}
      </div>
    </section>
  );
}
