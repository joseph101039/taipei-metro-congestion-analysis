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
exports.LineRouteController = void 0;
class LineRouteController {
    constructor(service) {
        this.service = service;
        this.getAllRoutes = this.getAllRoutes.bind(this);
        this.getRoutesByLineCode = this.getRoutesByLineCode.bind(this);
    }
    getAllRoutes(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const routes = yield this.service.getAllRoutes();
                res.json(routes);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getRoutesByLineCode(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.params;
                const routes = yield this.service.getRoutesByLineCode(code);
                if (routes.length === 0) {
                    res.status(404).json({ error: `No routes found for line: ${code}` });
                    return;
                }
                res.json(routes);
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.LineRouteController = LineRouteController;
