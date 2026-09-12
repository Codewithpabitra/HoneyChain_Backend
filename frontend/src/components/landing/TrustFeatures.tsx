"use client";

import { IconCpu, IconFlask2, IconLink, IconQrcode } from "@tabler/icons-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import FlightBeeDecor from "@/components/landing/FlightBeeDecor";

const features = [
  { icon: IconCpu, title: "Real Sensor Data", body: "Temperature, humidity, weight, and sound — an ESP32 node on every hive, feeding an AI model that flags stress before it becomes a crisis." },
  { icon: IconFlask2, title: "Lab-Verified Quality", body: "Moisture, sugar profile, and pollen analysis — certified by an accredited lab, not self-reported by anyone in the chain." },
  { icon: IconLink, title: "Tamper-Evident Custody", body: "Every handoff — beekeeper to processor to distributor — is a signed transaction. Change a record, and the mismatch is visible instantly." },
  { icon: IconQrcode, title: "One Scan, Full Story", body: "No app, no account. Scan the jar's QR and see the entire journey — origin, lab grade, custody — straight from Ethereum." },
];

export default function TrustFeatures() {
  return (
    <section id="features" className="relative px-6 md:px-12 py-28 border-t border-ink/10 dark:border-ink-dark/10">
      <FlightBeeDecor side="right" top="8%" />

      <ScrollReveal from="bottom" className="max-w-5xl mx-auto text-center mb-20">
        <h2 className="font-sans font-bold text-3xl md:text-5xl text-ink dark:text-ink-dark">
          Inside Every Record
        </h2>
        <p className="mt-4 text-ink/60 dark:text-ink-dark/60 max-w-md mx-auto">
          No heating the truth, no additives to the record — just what
          actually happened, verifiable on-chain.
        </p>
      </ScrollReveal>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-14">
        {features.map((f, i) => (
          <ScrollReveal
            key={f.title}
            from={i % 2 === 0 ? "bottom-left" : "bottom-right"}
            exitDirection={i % 2 === 0 ? "left" : "right"}
            className="flex gap-5"
          >
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center"
              style={{
                clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                backgroundColor: "var(--color-honey)",
              }}
            >
              <f.icon size={20} stroke={1.75} className="text-comb" />
            </div>
            <div>
              <h3 className="font-semibold text-ink dark:text-ink-dark">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60 leading-relaxed">{f.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}