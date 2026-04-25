export interface Ridership {
  id: number;
  date: string;       // YYYY-MM-DD
  hour: number;       // 0–23
  origin_id: number;
  destination_id: number;
  passengers: number;
}

export interface RidershipWithNames extends Omit<Ridership, 'origin_id' | 'destination_id'> {
  origin: string;
  destination: string;
}

export interface NewRidership {
  date: string;
  hour: number;
  origin_id: number;
  destination_id: number;
  passengers: number;
}
