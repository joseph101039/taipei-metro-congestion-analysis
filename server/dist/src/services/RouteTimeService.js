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
exports.RouteTimeService = void 0;
class RouteTimeService {
    constructor(routeTimeRepo, routeRepo) {
        this.routeTimeRepo = routeTimeRepo;
        this.routeRepo = routeRepo;
        this.graph = null;
    }
    getGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.graph)
                return this.graph;
            const [stations, lines] = yield Promise.all([
                this.routeRepo.findAllStations(),
                this.routeRepo.findAllLines(),
            ]);
            const stationById = new Map(stations.map((s) => [s.id, s]));
            const lineById = new Map(lines.map((l) => [l.id, l]));
            const byAlias = new Map();
            for (const s of stations) {
                if (!s.alias)
                    continue;
                if (!byAlias.has(s.alias))
                    byAlias.set(s.alias, []);
                byAlias.get(s.alias).push(s);
            }
            const byCoord = new Map();
            for (const s of stations) {
                if (s.lat == null || s.lng == null)
                    continue;
                const key = `${s.lat},${s.lng}`;
                if (!byCoord.has(key))
                    byCoord.set(key, []);
                byCoord.get(key).push(s);
            }
            this.graph = { stationById, lineById, byAlias, byCoord };
            return this.graph;
        });
    }
    findAllTransferIds() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.routeTimeRepo.findAllTransferIds();
            const result = {};
            for (const row of rows) {
                const ids = row.transfer_ids.split(',').map(Number).filter(Boolean);
                if (!result[row.from_station_id])
                    result[row.from_station_id] = {};
                result[row.from_station_id][row.to_station_id] = ids;
            }
            return result;
        });
    }
    findStationById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = yield this.getGraph();
            return graph.stationById.get(id);
        });
    }
    findRouteTime(fromId, toId) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = yield this.getGraph();
            const origin = graph.stationById.get(fromId);
            const destination = graph.stationById.get(toId);
            if (!origin || !destination)
                return null;
            const precomputed = yield this.routeTimeRepo.findRouteTime(fromId, toId);
            if (!precomputed)
                return null;
            return this.buildResponse(graph, origin, destination, precomputed);
        });
    }
    buildResponse(graph, origin, destination, precomputed) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const transferIds = precomputed.transfer_ids
                ? precomputed.transfer_ids.split(',').map(Number).filter(Boolean)
                : [];
            const segEndpoints = [];
            const transferStations = transferIds
                .map((id) => graph.stationById.get(id))
                .filter((s) => !!s);
            let currentBoard = origin;
            for (let i = 0; i < transferStations.length; i++) {
                const transferStation = transferStations[i];
                // Alight at the partner on the same line as currentBoard
                const alightPartner = this.findPartnerOnLine(graph, transferStation, currentBoard.line_id);
                segEndpoints.push({ board: currentBoard, alight: alightPartner });
                // Board the partner on the NEXT line — determine next line from next transfer or destination
                const nextTarget = i + 1 < transferStations.length ? transferStations[i + 1] : destination;
                currentBoard = this.findPartnerOnLine(graph, transferStation, nextTarget.line_id);
            }
            // Final segment: currentBoard → destination (or partner on same line)
            const finalAlight = this.findPartnerOnLine(graph, destination, currentBoard.line_id);
            segEndpoints.push({ board: currentBoard, alight: finalAlight });
            const segments = [];
            for (const { board, alight } of segEndpoints) {
                const line = graph.lineById.get(board.line_id);
                // Look up per-segment travel time from route_min_time table
                let segTime = 0;
                if (board.id !== alight.id) {
                    const segRoute = yield this.routeTimeRepo.findRouteTime(board.id, alight.id);
                    segTime = (_a = segRoute === null || segRoute === void 0 ? void 0 : segRoute.min_travel_time) !== null && _a !== void 0 ? _a : 0;
                }
                segments.push({
                    line: { id: line.id, code: line.code, name: line.name, color: line.color },
                    from: toStation(board),
                    to: toStation(alight),
                    travel_time_min: segTime,
                });
            }
            return {
                from: toStation(origin),
                to: toStation(destination),
                total_travel_time_min: precomputed.min_travel_time,
                transfers: segments.length - 1,
                segments,
            };
        });
    }
    findPartnerOnLine(graph, station, lineId) {
        var _a, _b, _c;
        if (station.line_id === lineId)
            return station;
        // Try alias-based lookup
        const alias = (_a = station.alias) !== null && _a !== void 0 ? _a : '';
        const aliasPartner = ((_b = graph.byAlias.get(alias)) !== null && _b !== void 0 ? _b : []).find((s) => s.line_id === lineId);
        if (aliasPartner)
            return aliasPartner;
        // Fallback: coordinate-based lookup (same physical location, different alias)
        if (station.lat != null && station.lng != null) {
            const key = `${station.lat},${station.lng}`;
            const coordPartner = ((_c = graph.byCoord.get(key)) !== null && _c !== void 0 ? _c : []).find((s) => s.line_id === lineId);
            if (coordPartner)
                return coordPartner;
        }
        return station;
    }
}
exports.RouteTimeService = RouteTimeService;
function toStation(s) {
    return { id: s.id, code: s.code, name: s.name };
}
