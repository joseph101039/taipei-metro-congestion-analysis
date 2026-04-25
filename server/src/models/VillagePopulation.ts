export interface VillagePopulationRecord {
  year_month: number;
  city: string;
  district: string;
  village: string;
  households: number;
  population: number;
  male: number;
  female: number;
}

export interface VillagePopulationResponse {
  data: VillagePopulationRecord[];
}
