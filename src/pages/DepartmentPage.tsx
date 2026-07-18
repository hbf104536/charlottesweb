import { Link, useParams, Navigate } from "react-router-dom";
import { getSector } from "../data/sectors";
import PowerWebGraph from "../components/PowerWebGraph";

export default function DepartmentPage() {
  const { sectorId, departmentId } = useParams<{ sectorId: string; departmentId: string }>();
  const sector = sectorId ? getSector(sectorId) : undefined;
  const department = sector?.departments?.find((d) => d.id === departmentId);

  if (!sectorId || !departmentId) return <Navigate to="/" replace />;
  if (!sector || !department) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-web-bg text-slate-300">
        <div className="text-center">
          <p className="mb-4">Department not found.</p>
          <Link to={`/sector/${sectorId ?? ""}`} className="text-sky-400 hover:underline">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PowerWebGraph
      title={department.name}
      description={department.description}
      backTo={`/sector/${sector.id}`}
      backLabel={sector.name}
      people={department.people}
      relationships={department.relationships}
    />
  );
}
