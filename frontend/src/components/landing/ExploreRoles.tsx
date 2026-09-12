"use client";

import Image from "next/image";
import Link from "next/link";
import { IconArrowUpRight } from "@tabler/icons-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const roles = [
  {
    image: "/images/landing/role-beekeeper.png",
    title: "Beekeeper",
    body: "Register hives, track AI health alerts, log harvests.",
    href: "/login",
  },
  {
    image: "/images/landing/role-lab.png",
    title: "Laboratory",
    body: "Certify quality and grade — on-chain, permanently.",
    href: "/login",
  },
  {
    image: "/images/landing/role-processor.png",
    title: "Processor",
    body: "Receive custody, move honey toward market.",
    href: "/login",
  },
  {
    image: "/images/landing/role-transporter.png",
    title: "Transporter",
    body: "Move batches between facilities, each leg signed on-chain.",
    href: "/login",
  },
  {
    image: "/images/landing/role-auditor.png",
    title: "Auditor / KVIC",
    body: "Monitor clusters, recall compromised batches when needed.",
    href: "/login",
  },
  {
    image: "/images/landing/role-consumer.png",
    title: "Consumer",
    body: "Scan the jar. See the whole story. No account needed.",
    href: "/verify",
  },
];

export default function ExploreRoles() {
  return (
    <section className="px-6 md:px-12 py-28 border-t border-ink/10 dark:border-ink-dark/10">
      <ScrollReveal className="max-w-5xl mx-auto text-center mb-16">
        <h2 className="font-sans font-bold text-3xl md:text-5xl text-ink dark:text-ink-dark">
          Explore By Role
        </h2>
      </ScrollReveal>

      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {roles.map((r, i) => (
          <ScrollReveal
            key={r.title}
            from={
              i % 3 === 0 ? "bottom-left" : i % 3 === 2 ? "bottom-right" : "bottom"
            }
            exitDirection={
              i % 3 === 0 ? "left" : i % 3 === 2 ? "right" : "none"
            }
          >
            <Link
              href={r.href}
              className="group block rounded-2xl overflow-hidden bg-ink/3 dark:bg-ink-dark/5 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="relative w-full aspect-4/3">
                <Image
                  src={r.image}
                  alt={r.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink dark:text-ink-dark">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">
                    {r.body}
                  </p>
                </div>
                <IconArrowUpRight
                  size={18}
                  className="shrink-0 text-honey group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}