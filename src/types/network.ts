export interface Person {
  id: string;
  name: string;
  title: string;
  bio: string;
  influence: number; // 1-10, drives node size
  imageUrl?: string;
}

export interface Relationship {
  source: string; // Person id
  target: string; // Person id
  type: string; // e.g. "advises", "funds", "college roommate"
}

export interface Sector {
  id: string;
  name: string;
  description: string;
  available: boolean;
  people: Person[];
  relationships: Relationship[];
}

export interface SectorsData {
  sectors: Sector[];
}
