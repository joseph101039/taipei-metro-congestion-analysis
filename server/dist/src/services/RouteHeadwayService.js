"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteHeadwayService = void 0;
class RouteHeadwayService {
    constructor(repo) {
        this.repo = repo;
    }
    getAll(serviceDay) {
        return this.repo.findAll(serviceDay);
    }
    getByRouteId(routeId, serviceDay) {
        return this.repo.findByRouteId(routeId, serviceDay);
    }
}
exports.RouteHeadwayService = RouteHeadwayService;
