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
exports.CongestionService = void 0;
class CongestionService {
    constructor(repo, routePathService) {
        this.repo = repo;
        this.routePathService = routePathService;
    }
    computeStationLoad(date, hour, minute) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.routePathService.ensureCache();
            const rows = yield this.fetchRowsForMultiDay(date, 1, hour, hour);
            if (minute !== undefined) {
                const load = this.computeForMinute(rows, hour, minute);
                return [{ date, hour, minute, stations: load }];
            }
            const results = [];
            for (let m = 0; m < 60; m++) {
                const load = this.computeForMinute(rows, hour, m);
                results.push({ date, hour, minute: m, stations: load });
            }
            return results;
        });
    }
    computeStationLoadRange(startDate, startHour, endHour, filterStationCodes, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.routePathService.ensureCache();
            const resolvedEndDate = endDate !== null && endDate !== void 0 ? endDate : startDate;
            const msPerDay = 24 * 60 * 60 * 1000;
            const numDays = Math.round((new Date(resolvedEndDate).getTime() - new Date(startDate).getTime()) / msPerDay) + 1;
            const rows = yield this.fetchRowsForMultiDay(startDate, numDays, startHour, endHour);
            const minutes = [];
            const loadsMap = new Map();
            let minuteIdx = 0;
            for (let day = 0; day < numDays; day++) {
                for (let h = startHour; h <= endHour; h++) {
                    for (let m = 0; m < 60; m++) {
                        // Encode as absolute minutes from startDate midnight
                        minutes.push(day * 24 * 60 + h * 60 + m);
                        const absHour = day * 24 + h;
                        const raw = this.computeForMinuteRaw(rows, absHour, m);
                        for (const [, { code, value }] of raw) {
                            if (!loadsMap.has(code))
                                loadsMap.set(code, []);
                            const arr = loadsMap.get(code);
                            while (arr.length < minuteIdx)
                                arr.push(null);
                            arr.push(value > 0.05 ? Math.round(value * 10) / 10 : null);
                        }
                        minuteIdx++;
                    }
                }
            }
            const totalMinutes = minutes.length;
            const loads = {};
            for (const [code, arr] of loadsMap) {
                if (filterStationCodes && !filterStationCodes.has(code))
                    continue;
                while (arr.length < totalMinutes)
                    arr.push(null);
                loads[code] = arr;
            }
            return { date: startDate, end_date: resolvedEndDate, start_hour: startHour, end_hour: endHour, minutes, loads };
        });
    }
    /**
     * Fetch ridership rows for all days in the multi-day range.
     * Rows are returned with `hour` expressed as absolute hours from startDate midnight
     * (negative for the day before startDate buffer, > 24*numDays for the day-after buffer).
     */
    fetchRowsForMultiDay(startDate, numDays, startHour, endHour) {
        return __awaiter(this, void 0, void 0, function* () {
            // For each day offset, we need hours [startHour-1 .. endHour+2] (for travel-time buffer)
            // Map: calendarDate → list of (calendarHour, absHour)
            const byDate = new Map();
            for (let day = 0; day < numDays; day++) {
                for (let h = startHour - 1; h <= endHour + 2; h++) {
                    const absHour = day * 24 + h;
                    let calendarDay = day;
                    let calendarHour = h;
                    if (h < 0) {
                        calendarDay = day - 1;
                        calendarHour = h + 24;
                    }
                    else if (h >= 24) {
                        calendarDay = day + 1;
                        calendarHour = h - 24;
                    }
                    const d = this.addDays(startDate, calendarDay);
                    if (!byDate.has(d))
                        byDate.set(d, []);
                    byDate.get(d).push({ calendarHour, absHour });
                }
            }
            const entries = Array.from(byDate.entries());
            const rowArrays = yield Promise.all(entries.map(([d, slots]) => this.repo.findRidershipByDateHours(d, slots.map(s => s.calendarHour))));
            const rows = [];
            for (let i = 0; i < entries.length; i++) {
                const [, slots] = entries[i];
                const calToAbs = new Map(slots.map(s => [s.calendarHour, s.absHour]));
                for (const row of rowArrays[i]) {
                    const absHour = calToAbs.get(row.hour);
                    if (absHour !== undefined) {
                        rows.push(Object.assign(Object.assign({}, row), { hour: absHour }));
                    }
                }
            }
            return rows;
        });
    }
    addDays(dateStr, days) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d + days);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    computeForMinuteRaw(rows, targetHour, targetMinute) {
        const load = new Map();
        const targetMin = targetHour * 60 + targetMinute;
        for (const row of rows) {
            const T = this.routePathService.getTravelTime(row.origin_id, row.destination_id);
            if (T === undefined)
                continue;
            const entryStart = row.hour * 60 - T;
            const entryEnd = row.hour * 60 + 60 - T;
            const path = this.routePathService.getPath(row.origin_id, row.destination_id);
            if (!path || path.length < 2)
                continue;
            for (let k = 0; k < path.length - 1; k++) {
                const dK = path[k].cumulativeMin;
                const dK1 = path[k + 1].cumulativeMin;
                const eMin = Math.max(entryStart, targetMin - dK1 + 1);
                const eMax = Math.min(entryEnd, targetMin - dK + 1);
                const overlap = Math.max(0, eMax - eMin);
                if (overlap <= 0)
                    continue;
                const contribution = (row.passengers / 60) * overlap;
                const existing = load.get(path[k].stationId);
                if (existing)
                    existing.value += contribution;
                else
                    load.set(path[k].stationId, { code: path[k].stationCode, value: contribution });
            }
        }
        return load;
    }
    computeForMinute(rows, targetHour, targetMinute) {
        const load = this.computeForMinuteRaw(rows, targetHour, targetMinute);
        const result = [];
        for (const [stationId, { code, value }] of load) {
            if (value > 0.05) {
                result.push({ station_id: stationId, code, estimated_load: Math.round(value * 10) / 10 });
            }
        }
        result.sort((a, b) => b.estimated_load - a.estimated_load);
        return result;
    }
}
exports.CongestionService = CongestionService;
