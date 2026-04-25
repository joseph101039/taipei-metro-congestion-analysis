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
const CongestionService_1 = require("../services/CongestionService");
// ── helpers ──────────────────────────────────────────────────────────────────
function makeRepo(rows) {
    return {
        findRidershipByDateHours: jest.fn().mockResolvedValue(rows),
    };
}
/**
 * Minimal RoutePathService stub: direct single-segment path A→B with given travel time.
 */
function makeRoutePathService(originId, destId, travelMin, stationCode = 'TST') {
    return {
        ensureCache: jest.fn().mockResolvedValue(undefined),
        getTravelTime: jest.fn().mockReturnValue(travelMin),
        getPath: jest.fn().mockReturnValue([
            { stationId: originId, stationCode, cumulativeMin: 0 },
            { stationId: destId, stationCode: 'DST', cumulativeMin: travelMin },
        ]),
    };
}
// ── single-day backward-compatibility ────────────────────────────────────────
describe('computeStationLoadRange – single day', () => {
    it('encodes minutes as h*60+m (values < 1440)', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo([]);
        const rps = makeRoutePathService(1, 2, 5);
        const service = new CongestionService_1.CongestionService(repo, rps);
        const result = yield service.computeStationLoadRange('2026-04-01', 7, 7);
        expect(result.date).toBe('2026-04-01');
        expect(result.end_date).toBe('2026-04-01');
        expect(result.minutes).toHaveLength(60);
        expect(result.minutes[0]).toBe(7 * 60); // 420
        expect(result.minutes[59]).toBe(7 * 60 + 59); // 479
        expect(result.minutes.every(m => m < 1440)).toBe(true);
    }));
});
// ── multi-day ─────────────────────────────────────────────────────────────────
describe('computeStationLoadRange – multi-day', () => {
    it('day-1 minutes start at 1440 + startHour*60', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo([]);
        const rps = makeRoutePathService(1, 2, 5);
        const service = new CongestionService_1.CongestionService(repo, rps);
        const result = yield service.computeStationLoadRange('2026-04-01', 7, 7, undefined, '2026-04-02');
        expect(result.date).toBe('2026-04-01');
        expect(result.end_date).toBe('2026-04-02');
        expect(result.minutes).toHaveLength(120); // 2 days × 60 minutes/hour × 1 hour
        // Day 0: 420..479
        expect(result.minutes[0]).toBe(7 * 60);
        expect(result.minutes[59]).toBe(7 * 60 + 59);
        // Day 1: 1440+420..1440+479
        expect(result.minutes[60]).toBe(1440 + 7 * 60);
        expect(result.minutes[119]).toBe(1440 + 7 * 60 + 59);
    }));
    it('fetches ridership for each calendar date separately', () => __awaiter(void 0, void 0, void 0, function* () {
        const findRidershipByDateHours = jest.fn().mockResolvedValue([]);
        const repo = { findRidershipByDateHours };
        const rps = makeRoutePathService(1, 2, 5);
        const service = new CongestionService_1.CongestionService(repo, rps);
        yield service.computeStationLoadRange('2026-04-01', 8, 8, undefined, '2026-04-02');
        const calledDates = findRidershipByDateHours.mock.calls.map(c => c[0]);
        // Should have fetched for 2026-04-01 and 2026-04-02 (and maybe 2026-03-31 for buffer)
        expect(calledDates).toContain('2026-04-01');
        expect(calledDates).toContain('2026-04-02');
    }));
    it('load values from day-1 rows appear at correct minuteIdx offset', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        // A passenger board at origin(1) going to dest(2), travel time 5 min.
        // Ridership row is on day-1 (2026-04-02), hour 8 → absHour = 24+8 = 32.
        // The row should contribute load at station TST around targetMin ~= 32*60 + some minutes.
        const day1Row = {
            origin_id: 1,
            destination_id: 2,
            passengers: 600,
            hour: 8,
        };
        const findRidershipByDateHours = jest.fn().mockImplementation((date) => {
            if (date === '2026-04-02')
                return Promise.resolve([day1Row]);
            return Promise.resolve([]);
        });
        const repo = { findRidershipByDateHours };
        const rps = makeRoutePathService(1, 2, 5, 'BL01');
        const service = new CongestionService_1.CongestionService(repo, rps);
        const result = yield service.computeStationLoadRange('2026-04-01', 8, 8, undefined, '2026-04-02');
        // Day-1 slots start at index 60 (day 0 = 60 minutes, day 1 = 60 minutes)
        const day1Loads = (_a = result.loads['BL01']) === null || _a === void 0 ? void 0 : _a.slice(60);
        expect(day1Loads).toBeDefined();
        expect(day1Loads.some(v => v !== null && v > 0)).toBe(true);
        // Day-0 should have no contribution from day-1 row
        const day0Loads = (_b = result.loads['BL01']) === null || _b === void 0 ? void 0 : _b.slice(0, 60);
        if (day0Loads) {
            expect(day0Loads.every(v => v === null)).toBe(true);
        }
    }));
});
// ── controller-level validation (via service interface) ───────────────────────
describe('computeStationLoadRange – end_date same as date', () => {
    it('treats missing end_date as same day', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo([]);
        const rps = makeRoutePathService(1, 2, 5);
        const service = new CongestionService_1.CongestionService(repo, rps);
        const result = yield service.computeStationLoadRange('2026-04-01', 9, 9);
        expect(result.end_date).toBe('2026-04-01');
        expect(result.minutes).toHaveLength(60);
    }));
});
