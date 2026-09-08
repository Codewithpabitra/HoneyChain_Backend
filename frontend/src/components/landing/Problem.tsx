const stats = [
  {
    value: "₹100Cr+",
    label: "estimated annual loss to counterfeit honey in India",
  },
  {
    value: "1 in 3",
    label: "honey samples fail purity tests in independent lab surveys",
  },
  {
    value: "0",
    label: "way for a buyer to check where their jar actually came from",
  },
];

export default function Problem() {
  return (
    <section className="px-6 md:px-12 py-24 border-t border-ink/10 dark:border-ink-dark/10">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-mono italic text-3xl md:text-4xl text-ink dark:text-ink-dark max-w-lg">
          Consumers can't tell real honey from syrup in a jar.
        </h2>
        <p className="mt-4 text-ink/60 dark:text-ink-dark/60 max-w-md">
          And rural beekeepers selling the real thing have no way to prove it —
          or charge for it.
        </p>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-mono text-4xl md:text-5xl text-honey">
                {stat.value}
              </div>
              <p className="mt-2 text-sm text-ink/60 dark:text-ink-dark/60 max-w-50">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
