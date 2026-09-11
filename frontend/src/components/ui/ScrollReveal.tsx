"use client";

import { useRef, ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";

interface ScrollRevealProps {
  children: ReactNode;
  from?: "bottom-left" | "bottom-right" | "bottom";
  exitDirection?: "left" | "right" | "none";
  className?: string;
}

export default function ScrollReveal({
  children,
  from = "bottom",
  exitDirection = "none",
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "end 0.08"],
  });

  const startX = from === "bottom-left" ? -70 : from === "bottom-right" ? 70 : 0;
  const endX = exitDirection === "left" ? -70 : exitDirection === "right" ? 70 : 0;

  const y = useTransform(scrollYProgress, [0, 0.24], [50, 0]);
  const x = useTransform(scrollYProgress, [0, 0.24, 0.78, 1], [startX, 0, 0, endX]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.82, 1],
    [0, 1, 1, exitDirection === "none" ? 1 : 0]
  );

  return (
    <motion.div ref={ref} style={{ y, x, opacity }} className={className}>
      {children}
    </motion.div>
  );
}