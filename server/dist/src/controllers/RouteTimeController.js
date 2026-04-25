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
exports.RouteTimeController = void 0;
class RouteTimeController {
    constructor(service) {
        this.service = service;
        this.getRouteTime = this.getRouteTime.bind(this);
        this.getTransferStations = this.getTransferStations.bind(this);
    }
    getRouteTime(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fromId = parseInt(req.query.from_station_id, 10);
                const toId = parseInt(req.query.to_station_id, 10);
                if (!Number.isInteger(fromId) || fromId <= 0) {
                    res.status(400).json({ error: "'from_station_id' must be a positive integer" });
                    return;
                }
                if (!Number.isInteger(toId) || toId <= 0) {
                    res.status(400).json({ error: "'to_station_id' must be a positive integer" });
                    return;
                }
                const [fromStation, toStation] = yield Promise.all([
                    this.service.findStationById(fromId),
                    this.service.findStationById(toId),
                ]);
                if (!fromStation) {
                    res.status(404).json({ error: `Station not found: ${fromId}` });
                    return;
                }
                if (!toStation) {
                    res.status(404).json({ error: `Station not found: ${toId}` });
                    return;
                }
                const result = yield this.service.findRouteTime(fromId, toId);
                if (!result) {
                    res.status(404).json({ error: 'No route found between the given stations' });
                    return;
                }
                res.json(result);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getTransferStations(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transfers = yield this.service.findAllTransferIds();
                res.json({ transfers });
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.RouteTimeController = RouteTimeController;
