import {
  ICongestionRepository,
  RouteMinTimeRow,
  SegmentTimeRow,
  TransferOverheadRow,
  StationRow,
} from '../repositories/CongestionRepository';

export interface PathNode {
  stationId: number;
  stationCode: string;
  cumulativeMin: number;
}

/**
 * Builds and caches the full path (with cumulative travel times)
 * for every OD pair in route_min_time.
 */
export class RoutePathService {
  private pathCache: Map<string, PathNode[]> | null = null;
  private travelTimeMap: Map<string, number> | null = null;

  constructor(private readonly repo: ICongestionRepository) {}

  async ensureCache(): Promise<void> {
    if (this.pathCache) return;
    const [routeMinTimes, segmentTimes, transfers, stations] = await Promise.all([
      this.repo.findAllRouteMinTimes(),
      this.repo.findAllSegmentTimes(),
      this.repo.findAllTransferOverheads(),
      this.repo.findAllStations(),
    ]);
    this.buildCache(routeMinTimes, segmentTimes, transfers, stations);
  }

  getPath(fromId: number, toId: number): PathNode[] | undefined {
    return this.pathCache?.get(`${fromId}|${toId}`);
  }

  getTravelTime(fromId: number, toId: number): number | undefined {
    return this.travelTimeMap?.get(`${fromId}|${toId}`);
  }

  private buildCache(
    routeMinTimes: RouteMinTimeRow[],
    segmentTimes: SegmentTimeRow[],
    transfers: TransferOverheadRow[],
    stations: StationRow[],
  ) {
    // Build lookup maps
    const stationById = new Map<number, StationRow>();
    const stationByCode = new Map<string, StationRow>();
    for (const s of stations) {
      stationById.set(s.id, s);
      stationByCode.set(s.code, s);
    }

    // Adjacency: code -> [{toCode, time}]
    const adj = new Map<string, { toCode: string; time: number }[]>();
    for (const seg of segmentTimes) {
      if (!adj.has(seg.from_station_code)) adj.set(seg.from_station_code, []);
      if (!adj.has(seg.to_station_code)) adj.set(seg.to_station_code, []);
      adj.get(seg.from_station_code)!.push({ toCode: seg.to_station_code, time: seg.travel_time_min });
      adj.get(seg.to_station_code)!.push({ toCode: seg.from_station_code, time: seg.travel_time_min });
    }

    // Transfer overhead lookup by station code
    // station_codes = "BR11/G16" → both "BR11" and "G16" map to this transfer
    const transferByCode = new Map<string, { codes: string[]; overhead: number }>();
    const transferCodesBySid = new Map<number, string[]>();
    for (const t of transfers) {
      const codes = t.station_codes.split('/');
      const entry = { codes, overhead: Number(t.avg_transfer_time_min) };
      for (const c of codes) {
        transferByCode.set(c, entry);
      }
      transferCodesBySid.set(t.transfer_station_sid, codes);
    }

    // Group stations by line for partner lookup
    const byAlias = new Map<string, StationRow[]>();
    const byCoord = new Map<string, StationRow[]>();
    for (const s of stations) {
      if (s.alias) {
        if (!byAlias.has(s.alias)) byAlias.set(s.alias, []);
        byAlias.get(s.alias)!.push(s);
      }
      if (s.lat != null && s.lng != null) {
        const key = `${s.lat},${s.lng}`;
        if (!byCoord.has(key)) byCoord.set(key, []);
        byCoord.get(key)!.push(s);
      }
    }

    const findPartnerOnLine = (station: StationRow, lineId: number): StationRow | undefined => {
      if (station.line_id === lineId) return station;
      if (station.alias) {
        const partner = byAlias.get(station.alias)?.find(s => s.line_id === lineId);
        if (partner) return partner;
      }
      if (station.lat != null && station.lng != null) {
        const key = `${station.lat},${station.lng}`;
        const partner = byCoord.get(key)?.find(s => s.line_id === lineId);
        if (partner) return partner;
      }
      return undefined;
    };

    // Build same-line path between two stations using BFS on segment graph
    const buildSameLinePath = (fromCode: string, toCode: string): string[] | null => {
      if (fromCode === toCode) return [fromCode];
      const fromStation = stationByCode.get(fromCode);
      const toStation = stationByCode.get(toCode);
      if (!fromStation || !toStation) return null;

      const lineId = fromStation.line_id;
      const visited = new Set<string>([fromCode]);
      const parent = new Map<string, string>();
      const queue = [fromCode];

      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === toCode) break;
        const neighbors = adj.get(cur) ?? [];
        for (const { toCode: next } of neighbors) {
          if (visited.has(next)) continue;
          const nextStation = stationByCode.get(next);
          if (!nextStation || nextStation.line_id !== lineId) continue;
          visited.add(next);
          parent.set(next, cur);
          queue.push(next);
        }
      }

      if (!parent.has(toCode) && fromCode !== toCode) return null;
      const path: string[] = [];
      let cur = toCode;
      while (cur !== fromCode) {
        path.push(cur);
        cur = parent.get(cur)!;
      }
      path.push(fromCode);
      path.reverse();
      return path;
    };

    // Compute cumulative times for a same-line path
    const computeCumTimes = (codes: string[]): number[] => {
      const times = [0];
      for (let i = 0; i < codes.length - 1; i++) {
        const neighbors = adj.get(codes[i]) ?? [];
        const edge = neighbors.find(n => n.toCode === codes[i + 1]);
        times.push(times[i] + (edge?.time ?? 2));
      }
      return times;
    };

    this.pathCache = new Map();
    this.travelTimeMap = new Map();

    for (const rmt of routeMinTimes) {
      const key = `${rmt.from_station_id}|${rmt.to_station_id}`;
      this.travelTimeMap.set(key, rmt.min_travel_time);

      const origin = stationById.get(rmt.from_station_id);
      const dest = stationById.get(rmt.to_station_id);
      if (!origin || !dest) continue;

      const transferTokens = rmt.transfer_ids
        ? rmt.transfer_ids.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      if (transferTokens.length === 0) {
        // Same line direct
        const codes = buildSameLinePath(origin.code, dest.code);
        if (!codes) continue;
        const cumTimes = computeCumTimes(codes);
        const pathNodes: PathNode[] = codes.map((c, i) => ({
          stationId: stationByCode.get(c)!.id,
          stationCode: c,
          cumulativeMin: cumTimes[i],
        }));
        this.pathCache.set(key, pathNodes);
      } else {
        // Multi-segment with transfers
        const transferStations = transferTokens
          .map((token) => {
            // Case 1: numeric station id
            if (/^\d+$/.test(token)) {
              const id = Number(token);
              const byStationId = stationById.get(id);
              if (byStationId) return byStationId;

              // Case 2: transfer SID (e.g. 10 => BR10/BL15)
              const sidCodes = transferCodesBySid.get(id);
              if (sidCodes && sidCodes.length > 0) {
                return stationByCode.get(sidCodes[0]);
              }
              return undefined;
            }

            // Case 3: station code token (e.g. R10, BL12, G16)
            return stationByCode.get(token);
          })
          .filter((s): s is StationRow => !!s);

        const pathNodes: PathNode[] = [];
        let cumTime = 0;
        let currentStation = origin;

        for (let i = 0; i < transferStations.length; i++) {
          const ts = transferStations[i];
          // Find partner of transfer station on same line as current
          const alightStation = findPartnerOnLine(ts, currentStation.line_id!) ?? ts;

          // Build same-line segment
          const segCodes = buildSameLinePath(currentStation.code, alightStation.code);
          if (segCodes) {
            const segTimes = computeCumTimes(segCodes);
            for (let j = (pathNodes.length > 0 ? 1 : 0); j < segCodes.length; j++) {
              pathNodes.push({
                stationId: stationByCode.get(segCodes[j])!.id,
                stationCode: segCodes[j],
                cumulativeMin: cumTime + segTimes[j],
              });
            }
            cumTime += segTimes[segTimes.length - 1];
          }

          // Add transfer overhead
          const transferEntry = transferByCode.get(alightStation.code) ?? transferByCode.get(ts.code);
          cumTime += transferEntry?.overhead ?? 3;

          // Board the next line
          const nextTarget = i + 1 < transferStations.length
            ? transferStations[i + 1]
            : dest;
          currentStation = findPartnerOnLine(ts, nextTarget.line_id!) ?? ts;
        }

        // Final segment
        const segCodes = buildSameLinePath(currentStation.code, dest.code);
        if (segCodes) {
          const segTimes = computeCumTimes(segCodes);
          for (let j = (pathNodes.length > 0 ? 1 : 0); j < segCodes.length; j++) {
            pathNodes.push({
              stationId: stationByCode.get(segCodes[j])!.id,
              stationCode: segCodes[j],
              cumulativeMin: cumTime + segTimes[j],
            });
          }
        }

        if (pathNodes.length > 0) {
          this.pathCache.set(key, pathNodes);
        }
      }
    }
  }
}

