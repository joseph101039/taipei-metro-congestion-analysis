import { ICongestionRepository, OdHourRow } from '../repositories/CongestionRepository';
import { RoutePathService, PathNode } from './RoutePathService';

export interface StationLoad {
  station_id: number;
  code: string;
  estimated_load: number;
}

export interface StationLoadResult {
  date: string;
  hour: number;
  minute: number;
  stations: StationLoad[];
}

export interface CompactLoadResult {
  date: string;
  end_date: string;
  start_hour: number;
  end_hour: number;
  minutes: number[];
  loads: Record<string, (number | null)[]>; // loads[stationCode][minuteIdx]
}

export class CongestionService {
  constructor(
    private readonly repo: ICongestionRepository,
    private readonly routePathService: RoutePathService,
  ) {}

  async computeStationLoad(date: string, hour: number, minute?: number): Promise<StationLoadResult[]> {
    await this.routePathService.ensureCache();

    const rows = await this.fetchRowsForMultiDay(date, 1, hour, hour);

    if (minute !== undefined) {
      const load = this.computeForMinute(rows, hour, minute);
      return [{ date, hour, minute, stations: load }];
    }

    const results: StationLoadResult[] = [];
    for (let m = 0; m < 60; m++) {
      const load = this.computeForMinute(rows, hour, m);
      results.push({ date, hour, minute: m, stations: load });
    }
    return results;
  }

  async computeStationLoadRange(
    startDate: string,
    startHour: number,
    endHour: number,
    filterStationCodes?: Set<string>,
    endDate?: string,
  ): Promise<CompactLoadResult> {
    await this.routePathService.ensureCache();

    const resolvedEndDate = endDate ?? startDate;
    const msPerDay = 24 * 60 * 60 * 1000;
    const numDays = Math.round(
      (new Date(resolvedEndDate).getTime() - new Date(startDate).getTime()) / msPerDay,
    ) + 1;

    const rows = await this.fetchRowsForMultiDay(startDate, numDays, startHour, endHour);

    const minutes: number[] = [];
    const loadsMap = new Map<string, (number | null)[]>();

    let minuteIdx = 0;
    for (let day = 0; day < numDays; day++) {
      for (let h = startHour; h <= endHour; h++) {
        for (let m = 0; m < 60; m++) {
          // Encode as absolute minutes from startDate midnight
          minutes.push(day * 24 * 60 + h * 60 + m);
          const absHour = day * 24 + h;
          const raw = this.computeForMinuteRaw(rows, absHour, m);

          for (const [, { code, value }] of raw) {
            if (!loadsMap.has(code)) loadsMap.set(code, []);
            const arr = loadsMap.get(code)!;
            while (arr.length < minuteIdx) arr.push(null);
            arr.push(value > 0.05 ? Math.round(value * 10) / 10 : null);
          }
          minuteIdx++;
        }
      }
    }

    const totalMinutes = minutes.length;
    const loads: Record<string, (number | null)[]> = {};
    for (const [code, arr] of loadsMap) {
      if (filterStationCodes && !filterStationCodes.has(code)) continue;
      while (arr.length < totalMinutes) arr.push(null);
      loads[code] = arr;
    }

    return { date: startDate, end_date: resolvedEndDate, start_hour: startHour, end_hour: endHour, minutes, loads };
  }

  /**
   * Fetch ridership rows for all days in the multi-day range.
   * Rows are returned with `hour` expressed as absolute hours from startDate midnight
   * (negative for the day before startDate buffer, > 24*numDays for the day-after buffer).
   */
  private async fetchRowsForMultiDay(
    startDate: string,
    numDays: number,
    startHour: number,
    endHour: number,
  ): Promise<OdHourRow[]> {
    // For each day offset, we need hours [startHour-1 .. endHour+2] (for travel-time buffer)
    // Map: calendarDate → list of (calendarHour, absHour)
    const byDate = new Map<string, { calendarHour: number; absHour: number }[]>();

    for (let day = 0; day < numDays; day++) {
      for (let h = startHour - 1; h <= endHour + 2; h++) {
        const absHour = day * 24 + h;
        let calendarDay = day;
        let calendarHour = h;
        if (h < 0) { calendarDay = day - 1; calendarHour = h + 24; }
        else if (h >= 24) { calendarDay = day + 1; calendarHour = h - 24; }
        const d = this.addDays(startDate, calendarDay);
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push({ calendarHour, absHour });
      }
    }

    const entries = Array.from(byDate.entries());
    const rowArrays = await Promise.all(
      entries.map(([d, slots]) => this.repo.findRidershipByDateHours(d, slots.map(s => s.calendarHour))),
    );

    const rows: OdHourRow[] = [];
    for (let i = 0; i < entries.length; i++) {
      const [, slots] = entries[i];
      const calToAbs = new Map<number, number>(slots.map(s => [s.calendarHour, s.absHour]));
      for (const row of rowArrays[i]) {
        const absHour = calToAbs.get(row.hour);
        if (absHour !== undefined) {
          rows.push({ ...row, hour: absHour });
        }
      }
    }
    return rows;
  }

  private addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private computeForMinuteRaw(rows: OdHourRow[], targetHour: number, targetMinute: number): Map<number, { code: string; value: number }> {
    const load = new Map<number, { code: string; value: number }>();
    const targetMin = targetHour * 60 + targetMinute;

    for (const row of rows) {
      const T = this.routePathService.getTravelTime(row.origin_id, row.destination_id);
      if (T === undefined) continue;
      const entryStart = row.hour * 60 - T;
      const entryEnd = row.hour * 60 + 60 - T;
      const path = this.routePathService.getPath(row.origin_id, row.destination_id);
      if (!path || path.length < 2) continue;

      for (let k = 0; k < path.length - 1; k++) {
        const dK = path[k].cumulativeMin;
        const dK1 = path[k + 1].cumulativeMin;
        const eMin = Math.max(entryStart, targetMin - dK1 + 1);
        const eMax = Math.min(entryEnd, targetMin - dK + 1);
        const overlap = Math.max(0, eMax - eMin);
        if (overlap <= 0) continue;
        const contribution = (row.passengers / 60) * overlap;
        const existing = load.get(path[k].stationId);
        if (existing) existing.value += contribution;
        else load.set(path[k].stationId, { code: path[k].stationCode, value: contribution });
      }
    }
    return load;
  }

  private computeForMinute(rows: OdHourRow[], targetHour: number, targetMinute: number): StationLoad[] {
    const load = this.computeForMinuteRaw(rows, targetHour, targetMinute);
    const result: StationLoad[] = [];
    for (const [stationId, { code, value }] of load) {
      if (value > 0.05) {
        result.push({ station_id: stationId, code, estimated_load: Math.round(value * 10) / 10 });
      }
    }
    result.sort((a, b) => b.estimated_load - a.estimated_load);
    return result;
  }
}
