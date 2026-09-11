"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-28 pt-24 md:px-6 md:pb-32 md:pt-32">
      {/* Decorative honeycomb background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-16 h-72 w-72 opacity-[0.08] dark:opacity-[0.1]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='104' viewBox='0 0 60 104'%3E%3Cpath d='M30 0L60 17.3V52L30 69.3L0 52V17.3Z' fill='none' stroke='%234A2E12' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: "60px 104px",
        }}
      />

      {/* Soft honey glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[30%] top-24 h-80 w-80 rounded-full bg-honey/10 blur-3xl"
      />

      <div className="relative mx-auto  max-w-7xl flex items-center">
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
          className="relative mx-auto h-64 w-64 shrink-0 md:mx-0 md:h-72 md:w-72 lg:h-80 lg:w-80"
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