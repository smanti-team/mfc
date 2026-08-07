const steps = [
  {
    n: "01",
    title: "Microbes break down waste",
    body: "Bacteria in the anode chamber digest organic matter in the substrate, releasing electrons as a by-product of their metabolism.",
  },
  {
    n: "02",
    title: "Electrons become current",
    body: "Freed electrons travel through an external circuit toward the cathode, generating a small but steady electrical current.",
  },
  {
    n: "03",
    title: "The sensor watches the water",
    body: "A TDS probe logs how much dissolved material remains in the chamber, timestamped and streamed straight to this dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <div className="rounded-2xl border border-sky-900/10 bg-white/80 backdrop-blur-md p-5 sm:p-8 shadow-xl shadow-sky-950/5">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold">How it works</p>
      <h2 className="mt-1 font-display text-lg font-bold text-slate-900 sm:text-xl">
        From organic waste to a live reading
      </h2>

      <ol className="mt-6 grid gap-6 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="border-t border-sky-900/10 pt-4">
            <span className="font-mono text-sm text-sky-600 font-bold">{step.n}</span>
            <h3 className="mt-2 font-display text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 font-medium">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
