"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StationSegmentTimeService = void 0;
class StationSegmentTimeService {
    constructor(repo) {
        this.repo = repo;
    }
    getAll(lineCode) {
        return this.repo.findAll(lineCode);
    }
    getBySegment(from, to) {
        return this.repo.findBySegment(from, to);
    }
}
exports.StationSegmentTimeService = StationSegmentTimeService;
