import { Link } from "react-router-dom";
import WebBackground from "../components/WebBackground";
import { sectorsData } from "../data/sectors";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <WebBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-14 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
            Charlotte&rsquo;s Web
          </h1>
          <p className="mt-4 text-balance text-base text-slate-400 sm:text-lg">
            An interactive map of influence &mdash; who holds power across America&rsquo;s
            sectors, and how they&rsquo;re connected.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {sectorsData.sectors.map((sector) => {
            const card = (
              <div
                className={`group relative rounded-xl border border-slate-800 bg-web-panel/60 p-6 backdrop-blur-sm transition-all duration-300 ${
                  sector.available
                    ? "hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-glow"
                    : "opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-100">{sector.name}</h2>
                  {sector.available ? (
                    <span className="h-2 w-2 rounded-full bg-sky-400 shadow-glow transition-transform group-hover:scale-125" />
                  ) : (
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-400">{sector.description}</p>
                {sector.available && (
                  <p className="mt-4 text-xs uppercase tracking-wide text-sky-400/80">
                    {sector.people.length} people &middot; {sector.relationships.length} connections
                  </p>
                )}
              </div>
            );

            return sector.available ? (
              <Link key={sector.id} to={`/sector/${sector.id}`}>
                {card}
              </Link>
            ) : (
              <div key={sector.id} className="cursor-not-allowed">
                {card}
              </div>
            );
          })}
        </div>

        <footer className="mt-16 text-xs text-slate-600">
          Placeholder data &middot; for demonstration purposes only.
        </footer>
      </div>
    </div>
  );
}
