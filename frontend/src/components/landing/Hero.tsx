"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative px-6 md:px-12 pt-28 md:pt-36 pb-20 overflow-hidden">
      {/* honeycomb texture, decorative, not the focal point */}
      <div
        aria-hidden
        className="absolute -top-20 -right-32 w-105 h-105 opacity-[0.06] dark:opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='104' viewBox='0 0 60 104'%3E%3Cpath d='M30 0L60 17.3V52L30 69.3L0 52V17.3Z' fill='none' stroke='%234A2E12' stroke-width='1'/%3E%3C/svg%3E\")",
          backgroundSize: "60px 104px",
        }}
      />

      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm text-comb/70 dark:text-honey/80 mb-6"
        >
          Ministry of MSME · KVIC Honey Mission
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-mono italic tracking-tight text-[2.75rem]  md:text-7xl  text-ink dark:text-ink-dark"
        >
          Every jar of honey
          <br />
          <span className="not-italic font-mono font-semibold text-honey">
            tells its own story.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base md:text-lg text-ink/70 dark:text-ink-dark/70 max-w-xl mx-auto "
        >
          HoneyChain follows a jar from hive to shelf — sensor data, lab
          certification, and custody, all recorded on-chain so a scan tells the
          truth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <Link href="/verify">
            <Button size="lg">
              Verify a jar <IconArrowRight size={18} stroke={2} />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">
              I'm a beekeeper
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
