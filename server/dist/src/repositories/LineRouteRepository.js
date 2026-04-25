"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineRouteRepository = void 0;
class LineRouteRepository {
    constructor(db) {
        this.db = db;
    }
    findAllRoutes() {
        return this.db('line_routes')
            .select('route_id', 'line_code', 'line_id', 'direction', 'route_name_zh', 'route_name_en')
            .orderBy('route_id');
    }
    findRoutesByLineCode(lineCode) {
        return this.db('line_routes')
            .select('route_id', 'line_code', 'line_id', 'direction', 'route_name_zh', 'route_name_en')
            .where('line_code', lineCode)
            .orderBy('route_id');
    }
    findStopsByRouteIds(routeIds) {
        return this.db('line_route_stops as rs')
            .leftJoin('stations as s', 's.code', 'rs.station_code')
            .select('rs.route_id', 'rs.station_code', 's.name as station_name', 'rs.stop_sequence', 'rs.cumulative_distance')
            .whereIn('rs.route_id', routeIds)
            .orderBy(['rs.route_id', 'rs.stop_sequence']);
    }
}
exports.LineRouteRepository = LineRouteRepository;
