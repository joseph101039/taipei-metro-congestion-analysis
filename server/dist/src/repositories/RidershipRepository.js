"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidershipRepository = void 0;
class RidershipRepository {
    constructor(db) {
        this.db = db;
    }
    findByDateHour(date, hour) {
        return this.db('ridership')
            .select('origin_id', 'destination_id', 'passengers')
            .where({ date, hour });
    }
    findFlows(date, hour, originId, destinationId) {
        const q = this.db('ridership')
            .select('origin_id', 'destination_id', 'passengers')
            .where({ date, hour });
        if (originId !== undefined)
            q.andWhere('origin_id', originId);
        if (destinationId !== undefined)
            q.andWhere('destination_id', destinationId);
        return q;
    }
}
exports.RidershipRepository = RidershipRepository;
