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
exports.RouteService = void 0;
class RouteService {
    constructor(repo) {
        this.repo = repo;
        this.graph = null;
    }
    // ── Graph ──────────────────────────────────────────────────────────────────
    getGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.graph)
                return this.graph;
            const [stations, lines, distances] = yield Promise.all([
                this.repo.findAllStations(),
                this.repo.findAllLines(),
                this.repo.findAllDistances(),
            ]);
            const stationById = new Map(stations.map((s) => [s.id, s]));
            const lineById = new Map(lines.map((l) => [l.id, l]));
            const adjacency = new Map();
            const addEdge = (from, to, distance_km, isTransfer) => {
                if (!adjacency.has(from))
                    adjacency.set(from, []);
                adjacency.get(from).push({ to, distance_km, isTransfer });
            };
            for (const { from_id, to_id, distance_km } of distances) {
                addEdge(from_id, to_id, distance_km, false);
                addEdge(to_id, from_id, distance_km, false);
            }
            const byAlias = new Map();
            for (const s of stations) {
                if (!s.alias)
                    continue;
                if (!byAlias.has(s.alias))
                    byAlias.set(s.alias, []);
                byAlias.get(s.alias).push(s);
            }
            for (const group of byAlias.values()) {
                if (group.length < 2)
                    continue;
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        if (group[i].line_id !== group[j].line_id) {
                            addEdge(group[i].id, group[j].id, 0, true);
                            addEdge(group[j].id, group[i].id, 0, true);
                        }
                    }
                }
            }
            this.graph = { stationById, lineById, byAlias, adjacency };
            return this.graph;
        });
    }
    // ── Public API ─────────────────────────────────────────────────────────────
    findStationById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = yield this.getGraph();
            return graph.stationById.get(id);
        });
    }
    findRoute(fromId, toId) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = yield this.getGraph();
            const origin = graph.stationById.get(fromId);
            const destination = graph.stationById.get(toId);
            if (!origin || !destination)
                return null;
            // 1. Try precomputed table
            const precomputed = yield this.repo.findPrecomputed(fromId, toId);
            if (precomputed) {
                return this.buildResponseFromPrecomputed(graph, origin, destination, precomputed);
            }
            // 2. Fallback: Dijkstra
            return this.dijkstraRoute(graph, origin, destination);
        });
    }
    // ── Reconstruct from shortest_routes row ───────────────────────────────────
    buildResponseFromPrecomputed(graph, origin, destination, precomputed) {
        var _a, _b, _c, _d, _e;
        const transferIds = precomputed.transfer_ids
            ? precomputed.transfer_ids.split(',').map(Number).filter(Boolean)
            : [];
        // Boarding stations: [origin, ...transferIds]
        const boardings = [origin, ...transferIds.map((id) => graph.stationById.get(id)).filter(Boolean)];
        const segments = [];
        for (let i = 0; i < boardings.length; i++) {
            const boarding = boardings[i];
            const isLast = i === boardings.length - 1;
            let alighting;
            if (isLast) {
                // Last segment: if destination is on a different line (alias transfer at dest),
                // alight at the alias partner on the current line instead
                if (destination.line_id !== boarding.line_id) {
                    const alias = (_a = destination.alias) !== null && _a !== void 0 ? _a : '';
                    const partner = ((_b = graph.byAlias.get(alias)) !== null && _b !== void 0 ? _b : []).find((s) => s.line_id === boarding.line_id);
                    alighting = partner !== null && partner !== void 0 ? partner : destination;
                }
                else {
                    alighting = destination;
                }
            }
            else {
                const nextBoarding = boardings[i + 1];
                const alias = (_c = nextBoarding.alias) !== null && _c !== void 0 ? _c : (_d = graph.stationById.get(nextBoarding.id)) === null || _d === void 0 ? void 0 : _d.alias;
                const partner = alias
                    ? ((_e = graph.byAlias.get(alias)) !== null && _e !== void 0 ? _e : []).find((s) => s.line_id === boarding.line_id)
                    : undefined;
                // If no alias partner found (branch transfer — different aliases), use nextBoarding directly
                alighting = partner !== null && partner !== void 0 ? partner : nextBoarding;
            }
            // Determine line: for branch crossings (boarding and alighting on different lines),
            // use the higher line_id which is the branch line (7=新北投支線, 8=小碧潭支線, 9=蘆洲支線)
            // — the branch line's segment list includes the junction station code.
            let lineId = boarding.line_id;
            if (alighting.line_id != null && alighting.line_id !== boarding.line_id) {
                lineId = Math.max(boarding.line_id, alighting.line_id);
            }
            const line = graph.lineById.get(lineId);
            const distance_km = this.lineSegmentDistance(graph, boarding.id, alighting.id);
            segments.push({
                line: { id: line.id, code: line.code, name: line.name, color: line.color },
                from: toRouteStation(boarding),
                to: toRouteStation(alighting),
                distance_km,
            });
        }
        const finalSegments = this.mergeParentChildSegments(graph, segments);
        return {
            from: toRouteStation(origin),
            to: toRouteStation(destination),
            total_distance_km: precomputed.total_distance_km,
            transfers: finalSegments.length - 1,
            segments: finalSegments,
        };
    }
    // Merge consecutive segments on parent ↔ child lines (e.g. 中和新蘆線 + 蘆洲支線).
    // These share the same physical train — no real transfer.
    mergeParentChildSegments(graph, segments) {
        if (segments.length < 2)
            return segments;
        const merged = [segments[0]];
        for (let i = 1; i < segments.length; i++) {
            const prev = merged[merged.length - 1];
            const cur = segments[i];
            if (this.isThroughServiceLine(graph, prev.line.id, cur.line.id)) {
                // Merge: keep parent line info, extend from/to and sum distance
                const parentLine = this.getParentLine(graph, prev.line.id, cur.line.id);
                merged[merged.length - 1] = {
                    line: parentLine,
                    from: prev.from,
                    to: cur.to,
                    distance_km: round2(prev.distance_km + cur.distance_km),
                };
            }
            else {
                merged.push(cur);
            }
        }
        return merged;
    }
    isThroughServiceLine(graph, lineIdA, lineIdB) {
        const a = graph.lineById.get(lineIdA);
        const b = graph.lineById.get(lineIdB);
        if (!a || !b)
            return false;
        const isParentChild = a.parent_line_id === lineIdB || b.parent_line_id === lineIdA;
        if (!isParentChild)
            return false;
        const child = a.parent_line_id !== null ? a : b;
        return RouteService.THROUGH_SERVICE_CODES.has(child.code);
    }
    getParentLine(graph, lineIdA, lineIdB) {
        const a = graph.lineById.get(lineIdA);
        const b = graph.lineById.get(lineIdB);
        const parent = a.parent_line_id === null ? a : b;
        return { id: parent.id, code: parent.code, name: parent.name, color: parent.color };
    }
    // Distance along line edges only (no transfers) from A to B
    lineSegmentDistance(graph, fromId, toId) {
        var _a, _b, _c;
        if (fromId === toId)
            return 0;
        const dist = new Map();
        const heap = [[0, fromId]];
        dist.set(fromId, 0);
        while (heap.length > 0) {
            heap.sort((a, b) => a[0] - b[0]);
            const [d, u] = heap.shift();
            if (u === toId)
                return round2(d);
            if (d > ((_a = dist.get(u)) !== null && _a !== void 0 ? _a : Infinity))
                continue;
            for (const edge of (_b = graph.adjacency.get(u)) !== null && _b !== void 0 ? _b : []) {
                if (edge.isTransfer)
                    continue;
                const nd = d + edge.distance_km;
                if (nd < ((_c = dist.get(edge.to)) !== null && _c !== void 0 ? _c : Infinity)) {
                    dist.set(edge.to, nd);
                    heap.push([nd, edge.to]);
                }
            }
        }
        return 0;
    }
    // ── Dijkstra fallback ──────────────────────────────────────────────────────
    dijkstraRoute(graph, origin, destination) {
        var _a, _b, _c, _d, _e, _f;
        const dist = new Map();
        const prev = new Map();
        const visited = new Set();
        const heap = [[0, origin.id]];
        for (const id of graph.stationById.keys())
            dist.set(id, Infinity);
        dist.set(origin.id, 0);
        while (heap.length > 0) {
            heap.sort((a, b) => a[0] - b[0]);
            const [d, u] = heap.shift();
            if (visited.has(u))
                continue;
            visited.add(u);
            if (u === destination.id)
                break;
            for (const edge of (_a = graph.adjacency.get(u)) !== null && _a !== void 0 ? _a : []) {
                const newDist = d + edge.distance_km;
                if (newDist < ((_b = dist.get(edge.to)) !== null && _b !== void 0 ? _b : Infinity)) {
                    dist.set(edge.to, newDist);
                    prev.set(edge.to, { node: u, isTransfer: edge.isTransfer });
                    heap.push([newDist, edge.to]);
                }
            }
        }
        if (((_c = dist.get(destination.id)) !== null && _c !== void 0 ? _c : Infinity) === Infinity)
            return null;
        const path = [];
        let cur = destination.id;
        while (cur !== undefined) {
            const p = prev.get(cur);
            path.unshift({ id: cur, isTransfer: (_d = p === null || p === void 0 ? void 0 : p.isTransfer) !== null && _d !== void 0 ? _d : false });
            cur = p === null || p === void 0 ? void 0 : p.node;
        }
        const segments = [];
        let segStart = path[0];
        let segDist = 0;
        for (let i = 1; i < path.length; i++) {
            const { id, isTransfer } = path[i];
            const edge = ((_e = graph.adjacency.get(path[i - 1].id)) !== null && _e !== void 0 ? _e : []).find((e) => e.to === id);
            const edgeKm = (_f = edge === null || edge === void 0 ? void 0 : edge.distance_km) !== null && _f !== void 0 ? _f : 0;
            // Also split on cross-line distance edges (branch lines like 新北投/小碧潭/蘆洲支線)
            const prevSt = graph.stationById.get(path[i - 1].id);
            const curSt = graph.stationById.get(id);
            const isBranchSwitch = !isTransfer && prevSt.line_id !== curSt.line_id;
            if (isTransfer || isBranchSwitch) {
                const fromSt = graph.stationById.get(segStart.id);
                const toSt = graph.stationById.get(path[i - 1].id);
                if (fromSt.id !== toSt.id) {
                    const line = graph.lineById.get(fromSt.line_id);
                    segments.push({
                        line: { id: line.id, code: line.code, name: line.name, color: line.color },
                        from: toRouteStation(fromSt),
                        to: toRouteStation(toSt),
                        distance_km: round2(segDist),
                    });
                }
                segStart = { id, isTransfer: false };
                segDist = isBranchSwitch ? edgeKm : 0; // branch edge distance belongs to new segment
            }
            else {
                segDist += edgeKm;
            }
        }
        const fromSt = graph.stationById.get(segStart.id);
        let lastLineId = fromSt.line_id;
        if (destination.line_id != null && destination.line_id !== fromSt.line_id) {
            lastLineId = Math.max(fromSt.line_id, destination.line_id);
        }
        const line = graph.lineById.get(lastLineId);
        segments.push({
            line: { id: line.id, code: line.code, name: line.name, color: line.color },
            from: toRouteStation(fromSt),
            to: toRouteStation(destination),
            distance_km: round2(segDist),
        });
        const finalSegments = this.mergeParentChildSegments(graph, segments);
        return {
            from: toRouteStation(origin),
            to: toRouteStation(destination),
            total_distance_km: round2(dist.get(destination.id)),
            transfers: finalSegments.length - 1,
            segments: finalSegments,
        };
    }
}
exports.RouteService = RouteService;
// Only 蘆洲支線 (orange_luzhou) shares physical trains with its parent (中和新蘆線).
// 新北投支線 and 小碧潭支線 are separate shuttles requiring a real transfer.
RouteService.THROUGH_SERVICE_CODES = new Set(['orange_luzhou']);
function toRouteStation(s) {
    return { id: s.id, code: s.code, name: s.name };
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
