"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StationService = void 0;
class StationService {
    constructor(repo) {
        this.repo = repo;
    }
    getAll() {
        return this.repo.findAll();
    }
    getByCode(code) {
        return this.repo.findByCode(code);
    }
}
exports.StationService = StationService;
