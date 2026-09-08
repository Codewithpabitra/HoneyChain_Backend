"use client";

import { motion } from "motion/react";

const impacts = [
  {
    for: "Beekeepers",
    gets: "Verified provenance means real honey commands a real price — no more competing with syrup at syrup prices.",
  },
  {
    for: "Consumers",
    gets: "One scan replaces blind trust. Origin, lab grade, and custody — all visible before you buy.",
  },
  {
    for: "KVIC",
    gets: "Cluster-wide visibility into hive health and honey flow, without a single manual audit.",
  },
];

export default function Impact() {
  return (
    <section className="px-6 md:px-12 py-24 border-t border-ink/10 dark:border-ink-dark/10 bg-comb/3 dark:bg-honey/3">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-mono italic text-3xl md:text-4xl text-ink dark:text-ink-dark max-w-lg">
          Trust, made visible.
        </h2>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
          {impacts.map((item, i) => (
            <motion.div
              key={item.for}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <h3 className="font-mono italic text-2xl text-honey mb-3">
                {item.for}
              </h3>
              <p className="text-sm text-ink/70 dark:text-ink-dark/70 leading-relaxed">
                {item.gets}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
