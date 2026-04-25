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
exports.StationSegmentTimeController = void 0;
class StationSegmentTimeController {
    constructor(service) {
        this.service = service;
        this.getAll = this.getAll.bind(this);
        this.getBySegment = this.getBySegment.bind(this);
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lineCode = req.query.line;
                const data = yield this.service.getAll(lineCode);
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getBySegment(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { from, to } = req.params;
                const data = yield this.service.getBySegment(from.toUpperCase(), to.toUpperCase());
                if (!data) {
                    res.status(404).json({ error: `Segment ${from}–${to} not found` });
                    return;
                }
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.StationSegmentTimeController = StationSegmentTimeController;
