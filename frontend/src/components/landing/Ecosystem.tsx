"use client";

import { motion } from "motion/react";
import {
  IconHome2,
  IconFlask2,
  IconBuildingWarehouse,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";

const roles = [
  {
    icon: IconHome2,
    role: "Beekeeper",
    does: "Registers hives, monitors AI health alerts, records harvests.",
  },
  {
    icon: IconFlask2,
    role: "Laboratory",
    does: "Certifies quality — moisture, sugar profile, grade — on-chain.",
  },
  {
    icon: IconBuildingWarehouse,
    role: "Processor / Distributor",
    does: "Receives custody transfers as the batch moves toward market.",
  },
  {
    icon: IconShieldCheck,
    role: "KVIC / Auditor",
    does: "Monitors clusters, recalls compromised batches when needed.",
  },
  {
    icon: IconUser,
    role: "Consumer",
    does: "Scans the jar. Sees the whole story. No app required.",
  },
];

export default function Ecosystem() {
  return (
    <section className="px-6 md:px-12 py-24 border-t border-ink/10 dark:border-ink-dark/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-mono italic text-3xl md:text-4xl text-ink dark:text-ink-dark max-w-lg">
          Five roles, one shared record.
        </h2>

        <div className="mt-14 flex flex-col divide-y divide-ink/10 dark:divide-ink-dark/10">
          {roles.map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="flex items-center gap-6 py-6"
            >
              <r.icon size={22} stroke={1.5} className="text-honey shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                <h3 className="font-medium text-ink dark:text-ink-dark w-44 shrink-0">
                  {r.role}
                </h3>
                <p className="text-sm text-ink/60 dark:text-ink-dark/60">
                  {r.does}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
