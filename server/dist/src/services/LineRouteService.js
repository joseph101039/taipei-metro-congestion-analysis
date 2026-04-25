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
exports.LineRouteService = void 0;
class LineRouteService {
    constructor(repo) {
        this.repo = repo;
    }
    buildRoutes(routes) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (routes.length === 0)
                return [];
            const routeIds = routes.map((r) => r.route_id);
            const stops = yield this.repo.findStopsByRouteIds(routeIds);
            const stopsByRoute = new Map();
            for (const stop of stops) {
                const list = (_a = stopsByRoute.get(stop.route_id)) !== null && _a !== void 0 ? _a : [];
                list.push(stop);
                stopsByRoute.set(stop.route_id, list);
            }
            return routes.map((r) => {
                var _a;
                return ({
                    routeId: r.route_id,
                    lineCode: r.line_code,
                    lineId: r.line_id,
                    direction: r.direction,
                    routeNameZh: r.route_name_zh,
                    routeNameEn: r.route_name_en,
                    stops: ((_a = stopsByRoute.get(r.route_id)) !== null && _a !== void 0 ? _a : []).map((s) => ({
                        stationCode: s.station_code,
                        stationName: s.station_name,
                        sequence: s.stop_sequence,
                        cumulativeDistanceKm: parseFloat(s.cumulative_distance),
                    })),
                });
            });
        });
    }
    getAllRoutes() {
        return __awaiter(this, void 0, void 0, function* () {
            const routes = yield this.repo.findAllRoutes();
            return this.buildRoutes(routes);
        });
    }
    getRoutesByLineCode(lineCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const routes = yield this.repo.findRoutesByLineCode(lineCode.toUpperCase());
            return this.buildRoutes(routes);
        });
    }
}
exports.LineRouteService = LineRouteService;
