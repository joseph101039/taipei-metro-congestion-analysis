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
exports.RidershipController = void 0;
class RidershipController {
    constructor(service) {
        this.service = service;
        this.getSnapshot = this.getSnapshot.bind(this);
        this.getFlows = this.getFlows.bind(this);
    }
    getSnapshot(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, hour: hourStr } = req.query;
                if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
                    res.status(400).json({ error: "'date' must be a valid date (YYYY-MM-DD)" });
                    return;
                }
                const hour = Number(hourStr);
                if (hourStr === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23) {
                    res.status(400).json({ error: "'hour' must be an integer between 0 and 23" });
                    return;
                }
                const data = yield this.service.getSnapshot(date, hour);
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getFlows(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { date, hour: hourStr, from_station_id, to_station_id } = req.query;
                if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
                    res.status(400).json({ error: "'date' must be a valid date (YYYY-MM-DD)" });
                    return;
                }
                const hour = Number(hourStr);
                if (hourStr === undefined || !Number.isInteger(hour) || hour < 0 || hour > 23) {
                    res.status(400).json({ error: "'hour' must be an integer between 0 and 23" });
                    return;
                }
                let originId;
                if (from_station_id !== undefined) {
                    originId = Number(from_station_id);
                    if (!Number.isInteger(originId) || originId <= 0) {
                        res.status(400).json({ error: "'from_station_id' must be a positive integer" });
                        return;
                    }
                }
                let destinationId;
                if (to_station_id !== undefined) {
                    destinationId = Number(to_station_id);
                    if (!Number.isInteger(destinationId) || destinationId <= 0) {
                        res.status(400).json({ error: "'to_station_id' must be a positive integer" });
                        return;
                    }
                }
                const data = yield this.service.getFlows(date, hour, originId, destinationId);
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.RidershipController = RidershipController;
