"use client";

import Image from "next/image";
import ScrollReveal from "@/components/ui/ScrollReveal";
import FlightBeeDecor from "@/components/landing/FlightBeeDecor";

const steps = [
  {
    image: "/images/landing/hive-illustration.png",
    title: "Harvest is registered",
    body: "The beekeeper logs quantity, floral origin, and apiary location. It's hashed and written to Ethereum — the instant a harvest happens, not after.",
  },
  {
    image: "/images/landing/honey-jar.png",
    title: "A lab certifies it",
    body: "Moisture, sugar profile, and pollen analysis are recorded on-chain against the batch, before it ever reaches a processor.",
  },
];

export default function HiveToJar() {
  return (
    <section id="how-it-works" className="relative px-6 md:px-12 py-28">
      <FlightBeeDecor side="left" top="4%" />

      <ScrollReveal from="bottom" className="max-w-5xl mx-auto text-center mb-20">
        <h2 className="font-sans font-bold text-3xl md:text-5xl text-ink dark:text-ink-dark">
          From Hive To Jar
        </h2>
      </ScrollReveal>

      <div className="max-w-5xl mx-auto flex flex-col gap-24 md:gap-32">
        {steps.map((step, i) => {
          const imageFirst = i % 2 === 0;
          return (
            <div
              key={step.title}
              className={`flex flex-col md:flex-row items-center gap-10 md:gap-16 ${
                imageFirst ? "" : "md:flex-row-reverse"
              }`}
            >
              <ScrollReveal
                from={imageFirst ? "bottom-left" : "bottom-right"}
                exitDirection={imageFirst ? "left" : "right"}
                className="w-48 h-48 md:w-64 md:h-64 relative shrink-0"
              >
                <Image src={step.image} alt={step.title} fill className="object-contain" />
              </ScrollReveal>

              <ScrollReveal
                from={imageFirst ? "bottom-right" : "bottom-left"}
                exitDirection={imageFirst ? "right" : "left"}
                className="flex-1 text-center md:text-left"
              >
                <span className="font-mono text-xs text-honey uppercase tracking-wider">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-sans font-bold text-2xl md:text-3xl text-ink dark:text-ink-dark">
                  {step.title}
                </h3>
                <p className="mt-3 text-ink/65 dark:text-ink-dark/65 leading-relaxed max-w-md mx-auto md:mx-0">
                  {step.body}
                </p>
              </ScrollReveal>
            </div>
          );
        })}
      </div>
    </section>
  );
}