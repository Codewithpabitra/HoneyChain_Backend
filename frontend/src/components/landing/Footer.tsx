import Link from "next/link";

export default function Footer() {
  return (
    <footer className="px-6 md:px-12 py-12 border-t border-ink/10 dark:border-ink-dark/10">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="font-mono italic text-xl text-ink dark:text-ink-dark">
            HoneyChain
          </p>
          <p className="text-sm text-ink/50 dark:text-ink-dark/50 mt-1">
            Smart India Hackathon · Problem Statement 26021
          </p>
        </div>

        <nav className="flex gap-6 text-sm text-ink/60 dark:text-ink-dark/60">
          <Link href="/verify" className="hover:text-honey transition-colors">
            Verify a jar
          </Link>
          <Link href="/about" className="hover:text-honey transition-colors">
            About
          </Link>
          <Link href="/login" className="hover:text-honey transition-colors">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
