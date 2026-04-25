"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineService = void 0;
class LineService {
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
exports.LineService = LineService;
