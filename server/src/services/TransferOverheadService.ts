import { ITransferOverheadRepository } from '../repositories/TransferOverheadRepository';
import { TransferOverhead } from '../models/TransferOverhead';

export interface ITransferOverheadService {
  getAll(): Promise<TransferOverhead[]>;
  getBySid(sid: number): Promise<TransferOverhead | undefined>;
}

export class TransferOverheadService implements ITransferOverheadService {
  constructor(private readonly repo: ITransferOverheadRepository) {}

  getAll(): Promise<TransferOverhead[]> {
    return this.repo.findAll();
  }

  getBySid(sid: number): Promise<TransferOverhead | undefined> {
    return this.repo.findBySid(sid);
  }
}

