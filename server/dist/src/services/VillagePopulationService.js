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
exports.VillagePopulationService = void 0;
class VillagePopulationService {
    constructor(repo) {
        this.repo = repo;
    }
    getByYearMonth(yearMonth, city) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.repo.findByYearMonth(yearMonth, city);
            return { data };
        });
    }
    getLatest(city) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.repo.findLatest(city);
            if (!data.length)
                return null;
            return { data };
        });
    }
}
exports.VillagePopulationService = VillagePopulationService;
