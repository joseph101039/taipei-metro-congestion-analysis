"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineCapacityService = void 0;
class LineCapacityService {
    constructor(repo) {
        this.repo = repo;
    }
    getAll() {
        return this.repo.findAll();
    }
}
exports.LineCapacityService = LineCapacityService;
