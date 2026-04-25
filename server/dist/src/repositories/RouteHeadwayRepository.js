"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteHeadwayRepository = void 0;
class RouteHeadwayRepository {
    constructor(db) {
        this.db = db;
    }
    findAll(serviceDay) {
        const q = this.db('route_headways').select('*').orderBy(['line_code', 'route_id', 'start_time']);
        if (serviceDay)
            q.where('service_day', serviceDay);
        return q;
    }
    findByRouteId(routeId, serviceDay) {
        const q = this.db('route_headways').select('*').where('route_id', routeId).orderBy('start_time');
        if (serviceDay)
            q.andWhere('service_day', serviceDay);
        return q;
    }
}
exports.RouteHeadwayRepository = RouteHeadwayRepository;
