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
exports.StationDistanceRepository = void 0;
class StationDistanceRepository {
    constructor(db) {
        this.db = db;
    }
    findAll(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.db('station_distances as sd')
                .join('stations as from_s', 'sd.from_station_id', 'from_s.id')
                .join('stations as to_s', 'sd.to_station_id', 'to_s.id')
                .select('sd.id', 'sd.distance_km', 'from_s.id as from_station_id', 'from_s.code as from_station_code', 'from_s.name as from_station_name', 'from_s.alias as from_station_alias', 'to_s.id as to_station_id', 'to_s.code as to_station_code', 'to_s.name as to_station_name', 'to_s.alias as to_station_alias');
            if (filter.from_code)
                query.where('from_s.code', filter.from_code);
            if (filter.from_name)
                query.where('from_s.name', filter.from_name);
            if (filter.to_code)
                query.where('to_s.code', filter.to_code);
            if (filter.to_name)
                query.where('to_s.name', filter.to_name);
            const rows = yield query;
            return rows.map((row) => ({
                id: row.id,
                distance_km: row.distance_km,
                from_station: {
                    id: row.from_station_id,
                    code: row.from_station_code,
                    name: row.from_station_name,
                    alias: row.from_station_alias,
                },
                to_station: {
                    id: row.to_station_id,
                    code: row.to_station_code,
                    name: row.to_station_name,
                    alias: row.to_station_alias,
                },
            }));
        });
    }
}
exports.StationDistanceRepository = StationDistanceRepository;
