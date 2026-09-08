"use client";

import { motion } from "motion/react";
import {
  IconDroplet,
  IconFlask,
  IconTruck,
  IconQrcode,
} from "@tabler/icons-react";

const steps = [
  {
    icon: IconDroplet,
    title: "Harvest is registered",
    body: "The beekeeper logs quantity, floral origin, and apiary location. It's hashed and written to Ethereum.",
  },
  {
    icon: IconFlask,
    title: "A lab certifies it",
    body: "Moisture, sugar profile, and pollen analysis are recorded on-chain against the batch.",
  },
  {
    icon: IconTruck,
    title: "Custody is tracked",
    body: "Every handoff — processor, distributor, retailer — is a signed, timestamped transfer.",
  },
  {
    icon: IconQrcode,
    title: "The jar gets a QR",
    body: "Printed on the label. Anyone can scan it and see the full, tamper-evident history.",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 md:px-12 py-24 border-t border-ink/10 dark:border-ink-dark/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-mono italic text-3xl md:text-4xl text-ink dark:text-ink-dark">
          From hive to shelf, in four steps.
        </h2>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-px bg-ink/10 dark:bg-ink-dark/10 rounded-2xl overflow-hidden">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-paper dark:bg-paper-dark p-7 flex flex-col gap-4"
            >
              <div
                className="w-11 h-11 flex items-center justify-center text-comb dark:text-honey"
                style={{
                  clipPath:
                    "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                  backgroundColor: "var(--color-honey)",
                }}
              >
                <step.icon size={20} stroke={1.75} className="text-comb" />
              </div>
              <div>
                <p className="text-xs text-ink/40 dark:text-ink-dark/40 mb-1">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-medium text-ink dark:text-ink-dark">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink/60 dark:text-ink-dark/60 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
