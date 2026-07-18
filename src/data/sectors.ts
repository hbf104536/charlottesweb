import raw from "./sectors.json";
import type { SectorsData } from "../types/network";

export const sectorsData = raw as SectorsData;

export function getSector(id: string) {
  return sectorsData.sectors.find((s) => s.id === id);
}
