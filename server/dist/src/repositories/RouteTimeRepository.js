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
exports.RouteTimeRepository = void 0;
class RouteTimeRepository {
    constructor(db) {
        this.db = db;
    }
    findRouteTime(fromId, toId) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.db('route_min_time')
                .select('from_station_id', 'to_station_id', 'min_travel_time', 'transfer_ids')
                .where({ from_station_id: fromId, to_station_id: toId })
                .first();
            return row !== null && row !== void 0 ? row : null;
        });
    }
    findAllTransferIds() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db('route_min_time')
                .select('from_station_id', 'to_station_id', 'transfer_ids')
                .whereNotNull('transfer_ids')
                .where('transfer_ids', '!=', '');
        });
    }
}
exports.RouteTimeRepository = RouteTimeRepository;
