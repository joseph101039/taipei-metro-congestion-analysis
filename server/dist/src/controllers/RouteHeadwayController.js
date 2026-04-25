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
exports.RouteHeadwayController = void 0;
class RouteHeadwayController {
    constructor(service) {
        this.service = service;
        this.getAll = this.getAll.bind(this);
        this.getByRouteId = this.getByRouteId.bind(this);
    }
    getAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const serviceDay = req.query.service_day;
                const data = yield this.service.getAll(serviceDay);
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getByRouteId(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { routeId } = req.params;
                const serviceDay = req.query.service_day;
                const data = yield this.service.getByRouteId(routeId, serviceDay);
                res.json(data);
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.RouteHeadwayController = RouteHeadwayController;
