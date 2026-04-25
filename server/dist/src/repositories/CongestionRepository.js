"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CongestionRepository = void 0;
class CongestionRepository {
    constructor(db) {
        this.db = db;
    }
    findRidershipByDateHours(date, hours) {
        return this.db('ridership')
            .select('origin_id', 'destination_id', 'passengers', 'hour')
            .where('date', date)
            .whereIn('hour', hours);
    }
    findAllRouteMinTimes() {
        return this.db('route_min_time')
            .select('from_station_id', 'to_station_id', 'min_travel_time', 'transfer_ids');
    }
    findAllSegmentTimes() {
        return this.db('station_segment_times')
            .select('line_code', 'from_station_code', 'to_station_code', 'travel_time_min');
    }
    findAllTransferOverheads() {
        return this.db('transfer_overheads')
            .select('transfer_station_sid', 'station_codes', 'avg_transfer_time_min');
    }
    findAllStations() {
        return this.db('stations')
            .select('id', 'code', 'name', 'line_id', 'alias', 'lat', 'lng');
    }
}
exports.CongestionRepository = CongestionRepository;
