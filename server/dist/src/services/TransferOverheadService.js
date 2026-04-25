"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferOverheadService = void 0;
class TransferOverheadService {
    constructor(repo) {
        this.repo = repo;
    }
    getAll() {
        return this.repo.findAll();
    }
    getBySid(sid) {
        return this.repo.findBySid(sid);
    }
}
exports.TransferOverheadService = TransferOverheadService;
