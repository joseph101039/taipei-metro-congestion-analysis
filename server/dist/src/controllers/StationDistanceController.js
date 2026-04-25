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
exports.StationDistanceController = void 0;
class StationDistanceController {
    constructor(service) {
        this.service = service;
        this.getDistances = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const filter = {
                    from_code: req.query.from_code,
                    from_name: req.query.from_name,
                    to_code: req.query.to_code,
                    to_name: req.query.to_name,
                };
                const data = yield this.service.getDistances(filter);
                res.json({ data });
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.StationDistanceController = StationDistanceController;
