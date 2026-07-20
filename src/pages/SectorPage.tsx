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

  return (
    <PowerWebGraph
      title={sector.name}
      description={sector.description}
      backTo="/"
      backLabel="Sectors"
      people={sector.people}
      relationships={sector.relationships}
      groups={sector.groups}
    />
  );
}
