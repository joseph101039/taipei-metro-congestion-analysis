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
exports.StationController = void 0;
class StationController {
    constructor(service) {
        this.service = service;
        this.getStations = this.getStations.bind(this);
        this.getStationByCode = this.getStationByCode.bind(this);
    }
    getStations(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.service.getAll();
                res.json({ data });
            }
            catch (err) {
                next(err);
            }
        });
    }
    getStationByCode(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const station = yield this.service.getByCode(req.params.code);
                if (!station) {
                    res.status(404).json({ error: 'Station not found' });
                    return;
                }
                res.json({ data: station });
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.StationController = StationController;
