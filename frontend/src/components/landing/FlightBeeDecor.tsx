"use client";

import Image from "next/image";
import { motion } from "motion/react";

interface FlightBeeDecorProps {
  side: "left" | "right";
  top?: string;
  src?: string;
}

export default function FlightBeeDecor({
  side,
  top = "10%",
  src = "/images/landing/flight-bee.png",
}: FlightBeeDecorProps) {
  const rotation = side === "left" ? 12 : -12;

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.85, rotate: rotation - 6 }}
      whileInView={{ opacity: 1, scale: 1, rotate: rotation }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hidden md:block absolute w-32 h-40 pointer-events-none select-none opacity-70"
      style={{
        top,
        [side]: "-2%",
      }}
    >
      <Image src={src} alt="" fill className="object-contain" />
    </motion.div>
  );
}