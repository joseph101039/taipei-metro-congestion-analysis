import { Knex } from 'knex';
import { TransferOverhead } from '../models/TransferOverhead';

export interface ITransferOverheadRepository {
  findAll(): Promise<TransferOverhead[]>;
  findBySid(sid: number): Promise<TransferOverhead | undefined>;
}

export class TransferOverheadRepository implements ITransferOverheadRepository {
  constructor(private readonly db: Knex) {}

  findAll(): Promise<TransferOverhead[]> {
    return this.db('transfer_overheads').select('*').orderBy('transfer_station_sid');
  }

  findBySid(sid: number): Promise<TransferOverhead | undefined> {
    return this.db('transfer_overheads').select('*').where('transfer_station_sid', sid).first();
  }
}

