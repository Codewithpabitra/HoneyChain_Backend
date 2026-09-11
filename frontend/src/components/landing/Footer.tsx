import Link from "next/link";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Verify a jar", href: "/verify" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "For beekeepers", href: "/register" },
      { label: "Live traceability", href: "/traceability" },
    ],
  },
  {
    heading: "Roles",
    links: [
      { label: "Beekeeper login", href: "/login" },
      { label: "Laboratory portal", href: "/login" },
      { label: "Processor dashboard", href: "/login" },
      { label: "KVIC / Auditor", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About HoneyChain", href: "/about" },
      { label: "Smart India Hackathon", href: "https://sih.gov.in" },
      { label: "Ministry of MSME", href: "https://msme.gov.in" },
      { label: "Contact", href: "mailto:hello@honeychain.app" },
    ],
  },
];

const socials = [
  { icon: IconBrandGithub, href: "https://github.com", label: "GitHub" },
  { icon: IconBrandLinkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: IconBrandX, href: "https://x.com", label: "X" },
  { icon: IconMail, href: "mailto:hello@honeychain.app", label: "Email" },
];

export default function Footer() {
  return (
    <footer className="relative pt-10">
      <div className="honey-drip h-10 bg-comb dark:bg-[#0d0a07]" aria-hidden />

      <div className="bg-comb dark:bg-[#0d0a07] text-paper">
        <div className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2">
              <p className="font-mono italic text-xl text-honey">
                HoneyChain
              </p>
              <p className="mt-3 text-sm text-paper/60 max-w-55 leading-relaxed">
                Blockchain-based honey traceability and smart beekeeping
                management. Built for Smart India Hackathon — Problem
                Statement 26021, Ministry of MSME.
              </p>

              <div className="mt-6 flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-paper/15 text-paper/60 hover:text-honey hover:border-honey transition-colors"
                  >
                    <s.icon size={15} stroke={1.75} />
                  </a>
                ))}
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.heading} className="col-span-1">
                <h4 className="text-xs font-medium uppercase tracking-wide text-paper/40 mb-4">
                  {col.heading}
                </h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-paper/70 hover:text-honey transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-paper/10">
          <div className="px-6 md:px-12 py-6 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-paper/50">
              © {new Date().getFullYear()} HoneyChain. Built for SIH 2026.
            </p>
            <p className="text-xs font-mono text-paper/40">
              Network: Ethereum Sepolia
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}