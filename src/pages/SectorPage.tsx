import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from "react-force-graph-2d";
import { getSector } from "../data/sectors";
import type { Person } from "../types/network";

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  title: string;
  bio: string;
  influence: number;
  x?: number;
  y?: number;
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
  type: string;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function SectorPage() {
  const { sectorId } = useParams<{ sectorId: string }>();
  const sector = sectorId ? getSector(sectorId) : undefined;

  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const peopleById = useMemo(() => {
    const map = new Map<string, Person>();
    sector?.people.forEach((p) => map.set(p.id, p));
    return map;
  }, [sector]);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    sector?.people.forEach((p) => map.set(p.id, new Set()));
    sector?.relationships.forEach((r) => {
      map.get(r.source)?.add(r.target);
      map.get(r.target)?.add(r.source);
    });
    return map;
  }, [sector]);

  const graphData = useMemo(() => {
    if (!sector) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };
    return {
      nodes: sector.people.map((p) => ({ ...p })) as GraphNode[],
      links: sector.relationships.map((r) => ({ ...r })) as GraphLink[],
    };
  }, [sector]);

  const searchResults = useMemo(() => {
    if (!query.trim() || !sector) return [];
    const q = query.trim().toLowerCase();
    return sector.people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, sector]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !sector || sector.people.length === 0) return;

    const influences = sector.people.map((p) => p.influence);
    const minInfluence = Math.min(...influences);
    const maxInfluence = Math.max(...influences);
    const halfSpread = Math.max(dimensions.height / 2 - 110, 100);

    function targetY(influence: number) {
      const t =
        maxInfluence === minInfluence
          ? 0.5
          : (influence - minInfluence) / (maxInfluence - minInfluence);
      // higher influence -> more negative y -> nearer the top
      // (the graph's coordinate origin is centered, not top-left)
      return (0.5 - t) * 2 * halfSpread;
    }

    function influenceYForce(strength: number) {
      let nodes: GraphNode[] = [];
      const force = (alpha: number) => {
        for (const n of nodes) {
          if (n.y === undefined) continue;
          const ty = targetY(n.influence);
          const delta = Math.max(-200, Math.min(200, ty - n.y));
          n.vy = (n.vy ?? 0) + delta * strength * alpha;
        }
      };
      force.initialize = (ns: GraphNode[]) => {
        nodes = ns;
      };
      return force;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("link") as any)?.distance(160).strength(0.3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("charge") as any)?.strength(-220);
    fg.d3Force("y", influenceYForce(0.15));
    fg.d3ReheatSimulation();
  }, [graphData, dimensions.height, sector]);

  const jumpToPerson = useCallback(
    (id: string) => {
      setSelectedId(id);
      setQuery("");
      const node = graphData.nodes.find((n) => n.id === id);
      if (node && node.x !== undefined && node.y !== undefined && graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 800);
        graphRef.current.zoom(3, 800);
      }
    },
    [graphData]
  );

  const handleNodeClick = useCallback((node: NodeObject) => {
    const id = (node as GraphNode).id;
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null);
  }, []);

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

  const activeNeighbors = selectedId ? neighborMap.get(selectedId) ?? new Set<string>() : null;

  return (
    <div className="flex h-screen w-screen flex-col bg-web-bg text-slate-200">
      <header className="z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-web-panel/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-400 transition-colors hover:text-sky-400">
            &larr; Sectors
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{sector.name}</h1>
            <p className="text-xs text-slate-500">{sector.description}</p>
          </div>
        </div>

        <div className="relative w-64">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a person..."
            className="w-full rounded-lg border border-slate-700 bg-web-bg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-sky-500"
          />
          {searchResults.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-web-panel shadow-xl">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => jumpToPerson(p.id)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-sky-500/10 hover:text-sky-300"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="#05070d"
          nodeRelSize={4}
          nodeVal={(n) => (n as GraphNode).influence}
          nodeLabel={(n) => {
            const node = n as GraphNode;
            const connections = Array.from(neighborMap.get(node.id) ?? [])
              .map((id) => peopleById.get(id)?.name)
              .filter(Boolean)
              .join(", ");
            return `
              <div style="max-width:260px;padding:10px 12px;background:#0b0f1a;border:1px solid #1e293b;border-radius:10px;color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                <div style="font-weight:600;font-size:14px;color:#f1f5f9;">${escapeHtml(node.name)}</div>
                <div style="font-size:11px;color:#7dd3fc;margin-top:2px;">${escapeHtml(node.title)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.4;">${escapeHtml(node.bio)}</div>
                ${connections ? `<div style="font-size:11px;color:#64748b;margin-top:8px;"><span style="color:#a855f7;">Key connections:</span> ${escapeHtml(connections)}</div>` : ""}
              </div>
            `;
          }}
          linkLabel={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            const sourceName = peopleById.get(sourceId)?.name ?? sourceId;
            const targetName = peopleById.get(targetId)?.name ?? targetId;
            return `
              <div style="padding:8px 10px;background:#0b0f1a;border:1px solid #1e293b;border-radius:8px;color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                <span style="color:#f1f5f9;">${escapeHtml(sourceName)}</span>
                <span style="color:#a855f7;"> ${escapeHtml(link.type)} </span>
                <span style="color:#f1f5f9;">${escapeHtml(targetName)}</span>
              </div>
            `;
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            const isSelected = selectedId === n.id;
            const isNeighbor = activeNeighbors?.has(n.id) ?? false;
            const isDimmed = selectedId !== null && !isSelected && !isNeighbor;

            const radius = 3 + n.influence * 1.1;
            const x = n.x ?? 0;
            const y = n.y ?? 0;

            if (isSelected || isNeighbor) {
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
              gradient.addColorStop(0, "rgba(56, 189, 248, 0.45)");
              gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isDimmed
              ? "rgba(100, 116, 139, 0.35)"
              : isSelected
              ? "#f0abfc"
              : "#38bdf8";
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = isDimmed ? "rgba(100,116,139,0.2)" : "rgba(224,242,254,0.6)";
            ctx.stroke();

            if (globalScale > 1.2) {
              ctx.font = `${12 / globalScale}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = isDimmed ? "rgba(148,163,184,0.35)" : "#cbd5e1";
              ctx.fillText(n.name, x, y + radius + 2);
            }
          }}
          linkColor={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            if (selectedId && (sourceId === selectedId || targetId === selectedId)) {
              return "rgba(125, 211, 252, 0.9)";
            }
            if (selectedId) return "rgba(100, 116, 139, 0.15)";
            return "rgba(125, 211, 252, 0.35)";
          }}
          linkWidth={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            return selectedId && (sourceId === selectedId || targetId === selectedId) ? 2 : 1;
          }}
          linkDirectionalParticles={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            return selectedId && (sourceId === selectedId || targetId === selectedId) ? 2 : 0;
          }}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => "#7dd3fc"}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 60)}
          cooldownTicks={300}
        />
      </div>
    </div>
  );
}
