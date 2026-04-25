import { IRidershipRepository } from '../repositories/RidershipRepository';

export type FlowMap = Record<string, Record<string, number>>;

export interface RidershipSnapshot {
  date: string;
  hour: number;
  total_passengers: number;
  flows: FlowMap;
}

export interface FlowRecord {
  origin_id: number;
  destination_id: number;
  passengers: number;
}

export interface FlowsResult {
  date: string;
  hour: number;
  total_passengers: number;
  flows: FlowRecord[];
}

export interface IRidershipService {
  getSnapshot(date: string, hour: number): Promise<RidershipSnapshot>;
  getFlows(date: string, hour: number, originId?: number, destinationId?: number): Promise<FlowsResult>;
}

export class RidershipService implements IRidershipService {
  constructor(private readonly repo: IRidershipRepository) {}

  async getSnapshot(date: string, hour: number): Promise<RidershipSnapshot> {
    const rows = await this.repo.findByDateHour(date, hour);

    const flows: FlowMap = {};
    let total_passengers = 0;

    for (const { origin_id, destination_id, passengers } of rows) {
      const o = String(origin_id);
      const d = String(destination_id);
      if (!flows[o]) flows[o] = {};
      flows[o][d] = passengers;
      total_passengers += passengers;
    }

    return { date, hour, total_passengers, flows };
  }

  async getFlows(date: string, hour: number, originId?: number, destinationId?: number): Promise<FlowsResult> {
    const rows = await this.repo.findFlows(date, hour, originId, destinationId);
    const total_passengers = rows.reduce((sum, r) => sum + r.passengers, 0);
    return {
      date,
      hour,
      total_passengers,
      flows: rows.map(({ origin_id, destination_id, passengers }) => ({ origin_id, destination_id, passengers })),
    };
  }
}
