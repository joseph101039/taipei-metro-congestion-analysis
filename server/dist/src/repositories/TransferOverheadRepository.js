"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferOverheadRepository = void 0;
class TransferOverheadRepository {
    constructor(db) {
        this.db = db;
    }
    findAll() {
        return this.db('transfer_overheads').select('*').orderBy('transfer_station_sid');
    }
    findBySid(sid) {
        return this.db('transfer_overheads').select('*').where('transfer_station_sid', sid).first();
    }
}
exports.TransferOverheadRepository = TransferOverheadRepository;
