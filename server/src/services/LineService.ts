import { ILineRepository, LineWithSegments } from '../repositories/LineRepository';

export interface ILineService {
  getAll(): Promise<LineWithSegments[]>;
  getByCode(code: string): Promise<LineWithSegments | null>;
}

export class LineService implements ILineService {
  constructor(private readonly repo: ILineRepository) {}

  getAll(): Promise<LineWithSegments[]> {
    return this.repo.findAll();
  }

  getByCode(code: string): Promise<LineWithSegments | null> {
    return this.repo.findByCode(code);
  }
}
