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
exports.RidershipService = void 0;
class RidershipService {
    constructor(repo) {
        this.repo = repo;
    }
    getSnapshot(date, hour) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.repo.findByDateHour(date, hour);
            const flows = {};
            let total_passengers = 0;
            for (const { origin_id, destination_id, passengers } of rows) {
                const o = String(origin_id);
                const d = String(destination_id);
                if (!flows[o])
                    flows[o] = {};
                flows[o][d] = passengers;
                total_passengers += passengers;
            }
            return { date, hour, total_passengers, flows };
        });
    }
    getFlows(date, hour, originId, destinationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this.repo.findFlows(date, hour, originId, destinationId);
            const total_passengers = rows.reduce((sum, r) => sum + r.passengers, 0);
            return {
                date,
                hour,
                total_passengers,
                flows: rows.map(({ origin_id, destination_id, passengers }) => ({ origin_id, destination_id, passengers })),
            };
        });
    }
}
exports.RidershipService = RidershipService;
