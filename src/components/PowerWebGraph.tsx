import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from "react-force-graph-2d";
import type { Person, Relationship, PersonGroup } from "../types/network";

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  title: string;
  bio: string;
  influence: number;
  role?: "official" | "private";
  source?: string;
  group?: string;
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

const GROUP_COLUMN_SPACING = 320;

interface PowerWebGraphProps {
  title: string;
  description: string;
  backTo: string;
  backLabel: string;
  people: Person[];
  relationships: Relationship[];
  groups?: PersonGroup[];
}

export default function PowerWebGraph({
  title,
  description,
  backTo,
  backLabel,
  people,
  relationships,
  groups,
}: PowerWebGraphProps) {
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
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    people.forEach((p) => map.set(p.id, new Set()));
    relationships.forEach((r) => {
      map.get(r.source)?.add(r.target);
      map.get(r.target)?.add(r.source);
    });
    return map;
  }, [people, relationships]);

  const graphData = useMemo(() => {
    return {
      nodes: people.map((p) => ({ ...p })) as GraphNode[],
      links: relationships.map((r) => ({ ...r })) as GraphLink[],
    };
  }, [people, relationships]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, people]);

  const isPrivateLink = useCallback(
    (link: GraphLink) => {
      const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
      const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
      return peopleById.get(sourceId)?.role === "private" || peopleById.get(targetId)?.role === "private";
    },
    [peopleById]
  );

  // Shared layout math: vertical tier by influence, horizontal column by group.
  // Used both to configure the force simulation and to place group header labels.
  const layout = useMemo(() => {
    const influences = people.map((p) => p.influence);
    const minInfluence = Math.min(...influences, 0);
    const maxInfluence = Math.max(...influences, 1);
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

    const groupIndex = new Map<string, number>();
    (groups ?? []).forEach((g, i) => groupIndex.set(g.id, i));
    const groupCount = groups?.length ?? 0;

    function targetX(groupId: string | undefined) {
      if (!groupId || !groupIndex.has(groupId)) return 0;
      const idx = groupIndex.get(groupId)!;
      return (idx - (groupCount - 1) / 2) * GROUP_COLUMN_SPACING;
    }

    const groupLabelPos = new Map<string, { x: number; y: number }>();
    (groups ?? []).forEach((g) => {
      const members = people.filter((p) => p.group === g.id);
      if (members.length === 0) return;
      const topY = Math.min(...members.map((p) => targetY(p.influence)));
      groupLabelPos.set(g.id, { x: targetX(g.id), y: topY - 60 });
    });

    return { targetY, targetX, groupLabelPos };
  }, [people, dimensions.height, groups]);

  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || people.length === 0) return;

    function influenceYForce(strength: number) {
      let nodes: GraphNode[] = [];
      const force = (alpha: number) => {
        for (const n of nodes) {
          if (n.y === undefined) continue;
          const ty = layout.targetY(n.influence);
          const delta = Math.max(-200, Math.min(200, ty - n.y));
          n.vy = (n.vy ?? 0) + delta * strength * alpha;
        }
      };
      force.initialize = (ns: GraphNode[]) => {
        nodes = ns;
      };
      return force;
    }

    function groupXForce(strength: number) {
      let nodes: GraphNode[] = [];
      const force = (alpha: number) => {
        for (const n of nodes) {
          if (!n.group || n.x === undefined) continue;
          const tx = layout.targetX(n.group);
          const delta = Math.max(-200, Math.min(200, tx - n.x));
          n.vx = (n.vx ?? 0) + delta * strength * alpha;
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
    fg.d3Force("x", groups && groups.length > 0 ? groupXForce(0.2) : null);
    fg.d3ReheatSimulation();
  }, [graphData, layout, people, groups]);

  const jumpToPerson = useCallback(
    (id: string) => {
      setSelectedId(id);
      setQuery("");
      const node = graphData.nodes.find((n) => n.id === id);
      if (node && node.x !== undefined && node.y !== undefined && graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 800);
        graphRef.current.zoom(2.4, 800);
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

  const activeNeighbors = selectedId ? neighborMap.get(selectedId) ?? new Set<string>() : null;
  const hasPrivateIndividuals = people.some((p) => p.role === "private");

  return (
    <div className="flex h-screen w-screen flex-col bg-web-bg text-slate-200">
      <header className="z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-web-panel/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link to={backTo} className="text-sm text-slate-400 transition-colors hover:text-sky-400">
            &larr; {backLabel}
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
            <p className="text-xs text-slate-500">{description}</p>
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
        {hasPrivateIndividuals && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-slate-800 bg-web-panel/80 px-3 py-2 text-xs text-slate-400 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
              Government official
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Private individual &middot; documented financial/influence tie
            </div>
          </div>
        )}
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
            const isPrivate = node.role === "private";
            return `
              <div style="max-width:280px;padding:10px 12px;background:#0b0f1a;border:1px solid ${isPrivate ? "#78350f" : "#1e293b"};border-radius:10px;color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                <div style="font-weight:600;font-size:14px;color:#f1f5f9;">${escapeHtml(node.name)}${isPrivate ? ' <span style="color:#fbbf24;font-size:10px;font-weight:600;">PRIVATE INDIVIDUAL</span>' : ""}</div>
                <div style="font-size:11px;color:${isPrivate ? "#fbbf24" : "#7dd3fc"};margin-top:2px;">${escapeHtml(node.title)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.4;">${escapeHtml(node.bio)}</div>
                ${node.source ? `<div style="font-size:10px;color:#64748b;margin-top:6px;">Source: ${escapeHtml(node.source)}</div>` : ""}
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
            const private_ = isPrivateLink(link);
            return `
              <div style="padding:8px 10px;background:#0b0f1a;border:1px solid ${private_ ? "#78350f" : "#1e293b"};border-radius:8px;color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                <span style="color:#f1f5f9;">${escapeHtml(sourceName)}</span>
                <span style="color:${private_ ? "#fbbf24" : "#a855f7"};"> ${escapeHtml(link.type)} </span>
                <span style="color:#f1f5f9;">${escapeHtml(targetName)}</span>
              </div>
            `;
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            const isSelected = selectedId === n.id;
            const isNeighbor = activeNeighbors?.has(n.id) ?? false;
            const isDimmed = selectedId !== null && !isSelected && !isNeighbor;
            const isPrivate = n.role === "private";

            const radius = 3 + n.influence * 1.1;
            const x = n.x ?? 0;
            const y = n.y ?? 0;

            if (isSelected || isNeighbor) {
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
              const glowColor = isPrivate ? "245, 158, 11" : "56, 189, 248";
              gradient.addColorStop(0, `rgba(${glowColor}, 0.45)`);
              gradient.addColorStop(1, `rgba(${glowColor}, 0)`);
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
              : isPrivate
              ? "#f59e0b"
              : "#38bdf8";
            ctx.fill();
            ctx.lineWidth = isPrivate ? 1.6 : 1.2;
            ctx.strokeStyle = isDimmed
              ? "rgba(100,116,139,0.2)"
              : isPrivate
              ? "rgba(253,230,138,0.85)"
              : "rgba(224,242,254,0.6)";
            if (isPrivate) ctx.setLineDash([2, 1.5]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (globalScale > 0.45) {
              const fontSize = Math.min(12 / globalScale, 20);
              ctx.font = `${fontSize}px Inter, sans-serif`;
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
            const private_ = isPrivateLink(link);
            if (selectedId && (sourceId === selectedId || targetId === selectedId)) {
              return private_ ? "rgba(251, 191, 36, 0.9)" : "rgba(125, 211, 252, 0.9)";
            }
            if (selectedId) return "rgba(100, 116, 139, 0.15)";
            return private_ ? "rgba(251, 191, 36, 0.45)" : "rgba(125, 211, 252, 0.35)";
          }}
          linkWidth={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            return selectedId && (sourceId === selectedId || targetId === selectedId) ? 2 : 1;
          }}
          linkLineDash={(l) => (isPrivateLink(l as unknown as GraphLink) ? [4, 3] : null)}
          linkDirectionalParticles={(l) => {
            const link = l as unknown as GraphLink;
            const sourceId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
            return selectedId && (sourceId === selectedId || targetId === selectedId) ? 2 : 0;
          }}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(l) => (isPrivateLink(l as unknown as GraphLink) ? "#fbbf24" : "#7dd3fc")}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 170)}
          onRenderFramePost={(ctx, globalScale) => {
            if (!groups || groups.length === 0) return;
            const fontSize = Math.min(15 / globalScale, 22);
            ctx.save();
            ctx.font = `700 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            groups.forEach((g) => {
              const pos = layout.groupLabelPos.get(g.id);
              if (!pos) return;
              const label = g.label.toUpperCase();
              const halfWidth = ctx.measureText(label).width / 2 + 6 / globalScale;
              ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
              ctx.fillText(label, pos.x, pos.y);
              ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
              ctx.lineWidth = 1 / globalScale;
              ctx.beginPath();
              ctx.moveTo(pos.x - halfWidth, pos.y + 6 / globalScale);
              ctx.lineTo(pos.x + halfWidth, pos.y + 6 / globalScale);
              ctx.stroke();
            });
            ctx.restore();
          }}
          cooldownTicks={300}
        />
      </div>
    </div>
  );
}
