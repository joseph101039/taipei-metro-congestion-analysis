"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteRepository = void 0;
class RouteRepository {
    constructor(db) {
        this.db = db;
    }
    findAllStations() {
        return this.db('stations').select('id', 'code', 'name', 'alias', 'line_id', 'lat', 'lng');
    }
    findAllLines() {
        return this.db('lines').select('id', 'code', 'name', 'color', 'parent_line_id');
    }
    findPrecomputed(fromId, toId) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.db('shortest_routes')
                .select('from_station_id', 'to_station_id', 'total_distance_km', 'transfer_ids')
                .where({ from_station_id: fromId, to_station_id: toId })
                .first();
            if (!row)
                return null;
            return Object.assign(Object.assign({}, row), { total_distance_km: parseFloat(row.total_distance_km) });
        });
    }
    findAllDistances() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.db('station_distances').select('from_station_id as from_id', 'to_station_id as to_id', 'distance_km');
            return rows.map((r) => ({
                from_id: r.from_id,
                to_id: r.to_id,
                distance_km: parseFloat(r.distance_km),
            }));
        });
    }
}
exports.RouteRepository = RouteRepository;
