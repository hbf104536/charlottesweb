import { Link, useParams, Navigate } from "react-router-dom";
import { getSector } from "../data/sectors";
import PowerWebGraph from "../components/PowerWebGraph";

export default function SectorPage() {
  const { sectorId } = useParams<{ sectorId: string }>();
  const sector = sectorId ? getSector(sectorId) : undefined;

  if (!sectorId) return <Navigate to="/" replace />;
  if (!sector) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-web-bg text-slate-300">
        <div className="text-center">
          <p className="mb-4">Sector not found.</p>
          <Link to="/" className="text-sky-400 hover:underline">
            Back to sectors
          </Link>
        </div>
      </div>
    );
  }

  if (sector.departments) {
    return (
      <div className="min-h-screen bg-web-bg text-slate-200">
        <header className="border-b border-slate-800 bg-web-panel/80 px-6 py-4 backdrop-blur-sm">
          <Link to="/" className="text-sm text-slate-400 transition-colors hover:text-sky-400">
            &larr; Sectors
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">{sector.name}</h1>
          <p className="text-sm text-slate-500">{sector.description}</p>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sector.departments.map((dept) => (
              <Link
                key={dept.id}
                to={`/sector/${sector.id}/${dept.id}`}
                className="group relative rounded-xl border border-slate-800 bg-web-panel/60 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-glow"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-100">{dept.name}</h2>
                  <span className="h-2 w-2 rounded-full bg-sky-400 shadow-glow transition-transform group-hover:scale-125" />
                </div>
                <p className="mt-2 text-sm text-slate-400">{dept.description}</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-sky-400/80">
                  {dept.people.length} people &middot; {dept.relationships.length} connections
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PowerWebGraph
      title={sector.name}
      description={sector.description}
      backTo="/"
      backLabel="Sectors"
      people={sector.people}
      relationships={sector.relationships}
    />
  );
}
