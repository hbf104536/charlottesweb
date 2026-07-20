import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { sectorsData } from "../data/sectors";
import type { Person, PersonGroup, Relationship, Sector, SectorsData } from "../types/network";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

function makeId(name: string) {
  return `${slugify(name)}-${Date.now().toString(36)}`;
}

function emptyPerson(): Person {
  return {
    id: makeId("person"),
    name: "New Person",
    title: "",
    bio: "",
    influence: 5,
    role: "official",
  };
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-web-bg px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-sky-500";
const labelClass = "mb-1 block text-[11px] uppercase tracking-wide text-slate-500";

export default function AdminPage() {
  const [data, setData] = useState<SectorsData>(() => JSON.parse(JSON.stringify(sectorsData)) as SectorsData);
  const [selectedSectorId, setSelectedSectorId] = useState(data.sectors[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const sector = data.sectors.find((s) => s.id === selectedSectorId);

  const updateSector = useCallback((sectorId: string, updater: (s: Sector) => Sector) => {
    setData((prev) => ({
      ...prev,
      sectors: prev.sectors.map((s) => (s.id === sectorId ? updater(s) : s)),
    }));
  }, []);

  const updatePerson = (sectorId: string, personId: string, patch: Partial<Person>) => {
    updateSector(sectorId, (s) => ({
      ...s,
      people: s.people.map((p) => (p.id === personId ? { ...p, ...patch } : p)),
    }));
  };

  const addPerson = (sectorId: string) => {
    updateSector(sectorId, (s) => ({ ...s, people: [...s.people, emptyPerson()] }));
  };

  const deletePerson = (sectorId: string, personId: string) => {
    updateSector(sectorId, (s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== personId),
      relationships: s.relationships.filter((r) => r.source !== personId && r.target !== personId),
    }));
  };

  const updateRelationship = (sectorId: string, index: number, patch: Partial<Relationship>) => {
    updateSector(sectorId, (s) => ({
      ...s,
      relationships: s.relationships.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const addRelationship = (sectorId: string, s: Sector) => {
    if (s.people.length < 2) return;
    updateSector(sectorId, (sec) => ({
      ...sec,
      relationships: [...sec.relationships, { source: s.people[0].id, target: s.people[1].id, type: "advises" }],
    }));
  };

  const deleteRelationship = (sectorId: string, index: number) => {
    updateSector(sectorId, (s) => ({
      ...s,
      relationships: s.relationships.filter((_, i) => i !== index),
    }));
  };

  const updateGroup = (sectorId: string, groupId: string, patch: Partial<PersonGroup>) => {
    updateSector(sectorId, (s) => ({
      ...s,
      groups: (s.groups ?? []).map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    }));
  };

  const addGroup = (sectorId: string) => {
    const id = makeId("group");
    updateSector(sectorId, (s) => ({
      ...s,
      groups: [...(s.groups ?? []), { id, label: "New Group" }],
    }));
  };

  const deleteGroup = (sectorId: string, groupId: string) => {
    updateSector(sectorId, (s) => ({
      ...s,
      groups: (s.groups ?? []).filter((g) => g.id !== groupId),
      people: s.people.map((p) => (p.group === groupId ? { ...p, group: undefined } : p)),
    }));
  };

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const resp = await fetch("/api/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, sectors: data.sectors }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMessage({ type: "error", text: json.error ?? `Save failed (${resp.status}).` });
      } else {
        setMessage({ type: "success", text: "Saved! The live site will update in a minute or two." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  if (!sector) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-web-bg text-slate-300">No sectors found.</div>
    );
  }

  return (
    <div className="min-h-screen bg-web-bg pb-32 text-slate-200">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-web-panel/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-400 transition-colors hover:text-sky-400">
            &larr; Site
          </Link>
          <h1 className="text-lg font-semibold text-slate-100">Admin &mdash; Charlotte&rsquo;s Web</h1>
        </div>
        <select
          value={selectedSectorId}
          onChange={(e) => setSelectedSectorId(e.target.value)}
          className={`${inputClass} w-56`}
        >
          {data.sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </header>

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        {/* Groups */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Groups (department clusters)</h2>
            <button
              onClick={() => addGroup(sector.id)}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-sky-400 hover:border-sky-500"
            >
              + Add group
            </button>
          </div>
          {(sector.groups ?? []).length === 0 && (
            <p className="text-sm text-slate-500">
              No groups &mdash; this sector renders as one flat web. Add a group to start clustering people into
              labeled sections.
            </p>
          )}
          <div className="space-y-2">
            {(sector.groups ?? []).map((g) => (
              <div key={g.id} className="flex items-center gap-2 rounded-md border border-slate-800 bg-web-panel/60 p-2">
                <input
                  value={g.label}
                  onChange={(e) => updateGroup(sector.id, g.id, { label: e.target.value })}
                  className={inputClass}
                  placeholder="Group label"
                />
                <button
                  onClick={() => deleteGroup(sector.id, g.id)}
                  className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* People */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">People (nodes)</h2>
            <button
              onClick={() => addPerson(sector.id)}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-sky-400 hover:border-sky-500"
            >
              + Add person
            </button>
          </div>
          <div className="space-y-4">
            {sector.people.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-800 bg-web-panel/60 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input
                      value={p.name}
                      onChange={(e) => updatePerson(sector.id, p.id, { name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Title / role</label>
                    <input
                      value={p.title}
                      onChange={(e) => updatePerson(sector.id, p.id, { title: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Background / bio</label>
                    <textarea
                      value={p.bio}
                      onChange={(e) => updatePerson(sector.id, p.id, { bio: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Influence (1-10, node size &amp; tier)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={p.influence}
                      onChange={(e) => updatePerson(sector.id, p.id, { influence: Number(e.target.value) })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      value={p.role ?? "official"}
                      onChange={(e) => updatePerson(sector.id, p.id, { role: e.target.value as Person["role"] })}
                      className={inputClass}
                    >
                      <option value="official">Government official</option>
                      <option value="private">Private individual</option>
                    </select>
                  </div>
                  {(sector.groups ?? []).length > 0 && (
                    <div>
                      <label className={labelClass}>Group</label>
                      <select
                        value={p.group ?? ""}
                        onChange={(e) => updatePerson(sector.id, p.id, { group: e.target.value || undefined })}
                        className={inputClass}
                      >
                        <option value="">(none)</option>
                        {(sector.groups ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {p.role === "private" && (
                    <div>
                      <label className={labelClass}>Source / citation</label>
                      <input
                        value={p.source ?? ""}
                        onChange={(e) => updatePerson(sector.id, p.id, { source: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. FEC records; NYT, Mar 2026"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => deletePerson(sector.id, p.id)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-500"
                  >
                    Delete person
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Relationships */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Connections</h2>
            <button
              onClick={() => addRelationship(sector.id, sector)}
              disabled={sector.people.length < 2}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-sky-400 hover:border-sky-500 disabled:opacity-40"
            >
              + Add connection
            </button>
          </div>
          <div className="space-y-2">
            {sector.relationships.map((r, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-slate-800 bg-web-panel/60 p-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <select
                  value={r.source}
                  onChange={(e) => updateRelationship(sector.id, i, { source: e.target.value })}
                  className={inputClass}
                >
                  {sector.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  value={r.type}
                  onChange={(e) => updateRelationship(sector.id, i, { type: e.target.value })}
                  className={inputClass}
                  placeholder="relationship, e.g. advises"
                />
                <select
                  value={r.target}
                  onChange={(e) => updateRelationship(sector.id, i, { target: e.target.value })}
                  className={inputClass}
                >
                  {sector.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteRelationship(sector.id, i)}
                  className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-web-panel/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className={`${inputClass} w-48`}
          />
          <button
            onClick={handleSave}
            disabled={saving || !password}
            className="rounded-md bg-sky-500 px-4 py-1.5 text-sm font-medium text-web-bg hover:bg-sky-400 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save & publish"}
          </button>
          {message && (
            <span className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
