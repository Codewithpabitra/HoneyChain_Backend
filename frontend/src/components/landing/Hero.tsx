"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import Button from "@/components/ui/Button";

// Matches the original background-image tile exactly: 60x104 tile,
// hex path 'M30 0L60 17.3V52L30 69.3L0 52V17.3Z' repeated on a straight grid.
const TILE_W = 60;
const TILE_H = 104;
const BOX_SIZE = 288; // h-72 / w-72 → 18rem → 288px
const COLS = Math.ceil(BOX_SIZE / TILE_W) + 1;
const ROWS = Math.ceil(BOX_SIZE / TILE_H) + 1;

function hexPath(x: number, y: number) {
  return `M${x + 30},${y} L${x + 60},${y + 17.3} L${x + 60},${y + 52} L${x + 30},${y + 69.3} L${x},${y + 52} L${x},${y + 17.3} Z`;
}

const tiles = Array.from({ length: COLS }, (_, col) =>
  Array.from({ length: ROWS }, (_, row) => hexPath(col * TILE_W, row * TILE_H))
).flat();

export default function Hero() {
  const svgRef = useRef<SVGSVGElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowOpacity = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 140, damping: 18, mass: 0.3 });
  const springY = useSpring(mouseY, { stiffness: 140, damping: 18, mass: 0.3 });
  const springOpacity = useSpring(glowOpacity, { stiffness: 200, damping: 26 });

  const handleSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = BOX_SIZE / rect.width;
    const scaleY = BOX_SIZE / rect.height;
    mouseX.set((e.clientX - rect.left) * scaleX);
    mouseY.set((e.clientY - rect.top) * scaleY);
    glowOpacity.set(1);
  };

  const handleSvgLeave = () => {
    glowOpacity.set(0);
  };

  return (
    <section className="relative overflow-hidden px-4 pb-28 pt-24 md:px-6 md:pb-32 md:pt-32">
      {/* Honeycomb background + hover glow — single shared geometry, so they always line up */}
      <svg
        ref={svgRef}
        onMouseMove={handleSvgMove}
        onMouseLeave={handleSvgLeave}
        viewBox={`0 0 ${BOX_SIZE} ${BOX_SIZE}`}
        className="absolute -left-10 -top-16 h-72 w-72"
      >
        <defs>
          <radialGradient id="hexGlowGradient">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
          <mask id="hexGlowMask">
            <rect width="100%" height="100%" fill="black" />
            <motion.circle cx={springX} cy={springY} r={70} fill="url(#hexGlowGradient)" />
          </mask>
          <filter id="hexGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Dim base pattern — always visible, matches the original look */}
        <g className="opacity-[0.08] dark:opacity-[0.1]">
          {tiles.map((d, i) => (
            <path key={`base-${i}`} d={d} fill="none" stroke="#4A2E12" strokeWidth={1} />
          ))}
        </g>

        {/* Glow pass — identical paths, lit only where the cursor mask reveals them */}
        <motion.g
          mask="url(#hexGlowMask)"
          filter="url(#hexGlowBlur)"
          style={{ opacity: springOpacity }}
        >
          {tiles.map((d, i) => (
            <path key={`glow-${i}`} d={d} fill="none" stroke="var(--color-honey)" strokeWidth={2} />
          ))}
        </motion.g>
      </svg>

      {/* Soft honey glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[30%] top-24 h-80 w-80 rounded-full bg-honey/10 blur-3xl"
      />

      <div className="relative mx-auto  max-w-7xl flex flex-col md:flex-row items-center">
        {/* =====================================================
            LEFT — HERO IMAGE
        ===================================================== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, x: -40 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative mx-auto hidden lg:block sm:h-64 sm:w-64 shrink-0 md:mx-0 md:h-72 md:w-72 lg:h-80 lg:w-80"
        >
          {/* Image glow */}
          <div
            aria-hidden
            className="absolute inset-8 rounded-full bg-honey/15 blur-3xl"
          />

          <Image
            src="/images/landing/hero-image.png"
            alt="Honey Chain mascot bee"
            fill
            priority
            className="relative object-contain drop-shadow-[0_25px_25px_rgba(74,46,18,0.18)] h-100 w-100 "
          />
        </motion.div>

        {/* =====================================================
            RIGHT — HERO CONTENT
        ===================================================== */}
        <div className="flex flex-col items-center text-center">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.2,
            }}
            className="mb-7 font-mono text-[10px] uppercase tracking-[0.2em] text-comb/70 dark:text-honey/80 md:text-xs"
          >
            Ministry of MSME · KVIC Honey Mission
          </motion.p>

          {/* =================================================
              MAIN HERO HEADING
          ================================================= */}
          <motion.h1
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-[clamp(4rem,8vw,8rem)] font-semibold leading-[0.82]  text-ink dark:text-ink-dark"
          >
            <span className="block">HIVE.</span>
            <span className="block text-honey">DATA.</span>
            <span className="block">TRUST.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.45,
            }}
            className="mt-10 max-w-xl px-2 text-base leading-7 text-ink/65 dark:text-ink-dark/65 md:text-lg md:leading-8"
          >
            Every jar traced from hive to shelf — sensor data, AI insights,
            quality certification, and custody records connected through one
            trusted digital chain.
          </motion.p>

          {/* =================================================
              ACTION BUTTONS
          ================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.55,
            }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link href="/verify">
              <Button size="lg">
                Verify a jar
                <IconArrowRight size={18} stroke={2} />
              </Button>
            </Link>

            <Link href="/register">
              <Button size="lg" variant="outline">
                I&apos;m a beekeeper
              </Button>
            </Link>
          </motion.div>

          {/* =================================================
              TECHNOLOGY LABELS
          ================================================= */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.8,
            }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[9px] tracking-[0.15em] text-ink/35 dark:text-ink-dark/35 md:text-sm"
          >
            <span>IoT</span>
            <span className="text-honey">•</span>

            <span>AI / ML</span>
            <span className="text-honey">•</span>

            <span>BLOCKCHAIN</span>
            <span className="text-honey">•</span>

            <span>QR</span>
            <span className="text-honey">•</span>

            <span>TRACEABILITY</span>
          </motion.div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="mt-20 flex flex-col items-center gap-2  font-medium tracking-[0.3em] text-ink/35 dark:text-ink-dark/35 text-xs"
      >
        <span>SCROLL TO EXPLORE</span>

        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-honey"
        >
          ↓
        </motion.span>
      </motion.div>
    </section>
  );
}