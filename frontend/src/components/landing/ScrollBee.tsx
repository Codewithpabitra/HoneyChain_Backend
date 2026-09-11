"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "motion/react";

export default function ScrollBee() {
  const { scrollYProgress } = useScroll();

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    mass: 0.6,
  });

  const left = useTransform(
    smoothProgress,
    [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.9, 1],
    ["72%", "80%", "12%", "78%", "14%", "76%", "50%", "50%"]
  );

  const top = useTransform(
    smoothProgress,
    [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.9, 1],
    ["22%", "34%", "44%", "56%", "66%", "78%", "88%", "92%"]
  );

  const rotate = useTransform(
    smoothProgress,
    [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.9, 1],
    [-6, 10, -10, 10, -10, 10, -4, 0]
  );

  const scale = useTransform(smoothProgress, [0, 0.05, 0.95, 1], [1, 1, 0.75, 0.75]);

  return (
    <motion.div
      aria-hidden
      className="fixed z-40 pointer-events-none select-none w-20 h-20 md:w-50 md:h-50"
      style={{ left, top, rotate, scale }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
      >
        <Image
          src="/images/landing/hero-bee.png"
          alt=""
          fill
          className="object-contain"
        />
      </motion.div>
    </motion.div>
  );
}