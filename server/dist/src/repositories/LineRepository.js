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
exports.LineRepository = void 0;
class LineRepository {
    constructor(db) {
        this.db = db;
    }
    attachSegments(lines) {
        return __awaiter(this, void 0, void 0, function* () {
            if (lines.length === 0)
                return [];
            const lineIds = lines.map((l) => l.id);
            const lineIdSet = new Set(lineIds);
            const rows = yield this.db('station_distances as sd')
                .join('stations as fs', 'sd.from_station_id', 'fs.id')
                .join('stations as ts', 'sd.to_station_id', 'ts.id')
                .where(function () {
                this.whereIn('fs.line_id', lineIds).orWhereIn('ts.line_id', lineIds);
            })
                .select('fs.line_id as from_line_id', 'ts.line_id as to_line_id', 'fs.code as from_code', 'ts.code as to_code');
            const map = new Map();
            for (const row of rows) {
                // Cross-line rows are branch connecting segments (e.g. R22→R22A):
                // assign to the TO station's line (the branch), not the FROM station's (the main line).
                const lineId = row.from_line_id === row.to_line_id ? row.from_line_id : row.to_line_id;
                if (!lineIdSet.has(lineId))
                    continue;
                if (!map.has(lineId))
                    map.set(lineId, []);
                map.get(lineId).push({ from: row.from_code, to: row.to_code });
            }
            return lines.map((line) => { var _a; return (Object.assign(Object.assign({}, line), { segments: (_a = map.get(line.id)) !== null && _a !== void 0 ? _a : [] })); });
        });
    }
    findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const lines = yield this.db('lines').select('*').orderBy('id');
            return this.attachSegments(lines);
        });
    }
    findByCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const line = yield this.db('lines').where({ code }).first();
            if (!line)
                return null;
            const [result] = yield this.attachSegments([line]);
            return result;
        });
    }
}
exports.LineRepository = LineRepository;
