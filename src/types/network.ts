export type PersonRole = "official" | "private";

export interface Person {
  id: string;
  name: string;
  title: string;
  bio: string;
  influence: number; // 1-10, drives node size
  imageUrl?: string;
  /** "official" = government office holder, "private" = private individual with documented influence/financial ties */
  role?: PersonRole;
  /** Source URL backing a "private" role's documented connection, shown in the tooltip */
  source?: string;
}

export interface Relationship {
  source: string; // Person id
  target: string; // Person id
  type: string; // e.g. "advises", "funds", "college roommate"
}

export interface Department {
  id: string;
  name: string;
  description: string;
  people: Person[];
  relationships: Relationship[];
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  available: boolean;
  people: Person[];
  relationships: Relationship[];
  /** When present, this sector is a hub linking to per-department webs instead of one flat graph */
  departments?: Department[];
}

export interface SectorsData {
  sectors: Sector[];
}
