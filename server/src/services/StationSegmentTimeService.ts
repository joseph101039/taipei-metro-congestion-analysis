import { IStationSegmentTimeRepository } from '../repositories/StationSegmentTimeRepository';
import { StationSegmentTime } from '../models/StationSegmentTime';

export interface IStationSegmentTimeService {
  getAll(lineCode?: string): Promise<StationSegmentTime[]>;
  getBySegment(from: string, to: string): Promise<StationSegmentTime | undefined>;
}

export class StationSegmentTimeService implements IStationSegmentTimeService {
  constructor(private readonly repo: IStationSegmentTimeRepository) {}

  getAll(lineCode?: string): Promise<StationSegmentTime[]> {
    return this.repo.findAll(lineCode);
  }

  getBySegment(from: string, to: string): Promise<StationSegmentTime | undefined> {
    return this.repo.findBySegment(from, to);
  }
}

