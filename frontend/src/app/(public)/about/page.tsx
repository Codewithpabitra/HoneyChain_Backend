import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { IconTarget, IconBulb, IconUsers } from "@tabler/icons-react";

const pillars = [
  {
    icon: IconTarget,
    title: "The problem",
    body: "Counterfeit honey, weak market linkages, and rural beekeepers with no way to prove — or price — the real thing.",
  },
  {
    icon: IconBulb,
    title: "The approach",
    body: "IoT hive sensors, an AI health model, and an Ethereum-backed ledger that makes every batch's history tamper-evident.",
  },
  {
    icon: IconUsers,
    title: "Who it's for",
    body: "Beekeepers under KVIC's Honey Mission, the labs and processors in between, and the consumer holding the jar.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="px-6 md:px-12 py-24">
        <ScrollReveal from="bottom" className="max-w-3xl mx-auto text-center mb-20">
          <p className="font-mono text-xs tracking-wider uppercase text-honey mb-4">
            About HoneyChain
          </p>
          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.95] tracking-tight text-ink dark:text-ink-dark">
            Built for Smart India
            <br />
            Hackathon 2026
          </h1>
          <p className="mt-6 text-ink/70 dark:text-ink-dark/70 max-w-xl mx-auto">
            HoneyChain answers Problem Statement 26021 — a blockchain-based
            honey traceability and smart beekeeping system, submitted under
            the Ministry of MSME.
          </p>
        </ScrollReveal>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {pillars.map((p, i) => (
            <ScrollReveal
              key={p.title}
              from={i === 0 ? "bottom-left" : i === 2 ? "bottom-right" : "bottom"}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{
                  clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                  backgroundColor: "var(--color-honey)",
                }}
              >
                <p.icon size={20} stroke={1.75} className="text-comb" />
              </div>
              <h3 className="font-semibold text-ink dark:text-ink-dark mb-2">
                {p.title}
              </h3>
              <p className="text-sm text-ink/60 dark:text-ink-dark/60 leading-relaxed">
                {p.body}
              </p>
            </ScrollReveal>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}