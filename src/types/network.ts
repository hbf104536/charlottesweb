export type PersonRole = "official" | "private";

export interface Person {
  id: string;
  name: string;
  title: string;
  bio: string;
  influence: number; // 1-10, drives node size and vertical tier
  imageUrl?: string;
  /** "official" = government office holder, "private" = private individual with documented influence/financial ties */
  role?: PersonRole;
  /** Source citation backing a "private" role's documented connection, shown in the tooltip */
  source?: string;
  /** Optional cluster id (e.g. a department) this person belongs to, used to group and label nodes spatially */
  group?: string;
  /** Manually dragged position (set via the admin panel), overrides the automatic layout for this node */
  manualX?: number;
  manualY?: number;
}

export interface Relationship {
  source: string; // Person id
  target: string; // Person id
  type: string; // e.g. "advises", "funds", "college roommate"
}

export interface PersonGroup {
  id: string;
  label: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  available: boolean;
  people: Person[];
  relationships: Relationship[];
  /** Optional named clusters (e.g. departments) for spatial grouping + header labels within one graph */
  groups?: PersonGroup[];
}

export interface SectorsData {
  sectors: Sector[];
}
