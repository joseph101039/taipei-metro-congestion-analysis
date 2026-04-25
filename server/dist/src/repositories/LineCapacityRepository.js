"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineCapacityRepository = void 0;
class LineCapacityRepository {
    constructor(db) {
        this.db = db;
    }
    findAll() {
        return this.db('line_capacities').select('*');
    }
}
exports.LineCapacityRepository = LineCapacityRepository;
