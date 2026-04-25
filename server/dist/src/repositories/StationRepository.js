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
exports.StationRepository = void 0;
class StationRepository {
    constructor(db) {
        this.db = db;
    }
    baseQuery() {
        return this.db('stations as s')
            .select('s.id', 's.code', 's.name', 's.alias', 's.line_id', 's.lat', 's.lng');
    }
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.baseQuery().orderBy('s.id');
        });
    }
    findByCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.baseQuery().where('s.code', code).first();
            return row !== null && row !== void 0 ? row : null;
        });
    }
}
exports.StationRepository = StationRepository;
