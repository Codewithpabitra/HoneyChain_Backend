"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { IconArrowLeft } from "@tabler/icons-react";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -12, rotate: -8 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-24 h-24 mb-6"
      >
        <Image
          src="/images/landing/hero-image.png"
          alt=""
          fill
          priority
          sizes="36px"
          className="object-contain"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="font-mono text-sm text-honey mb-3"
      >
        404
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.18 }}
        className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-ink dark:text-ink-dark"
      >
        This hive is empty.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.28 }}
        className="mt-4 text-ink/60 dark:text-ink-dark/60 max-w-sm"
      >
        The page you're looking for doesn't exist, or the bee took a wrong
        turn.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.38 }}
        className="mt-8"
      >
        <Link href="/">
          <Button size="lg">
            <IconArrowLeft size={18} stroke={2} />
            Back to home
          </Button>
        </Link>
      </motion.div>
    </main>
  );
}