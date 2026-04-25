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
exports.VillagePopulationRepository = void 0;
class VillagePopulationRepository {
    constructor(db) {
        this.db = db;
    }
    findByYearMonth(yearMonth, city) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = this.db('village_population')
                .select('year_month', 'city', 'district', 'village', 'households', 'population', 'male', 'female')
                .where({ year_month: yearMonth })
                .orderBy(['city', 'district', 'village']);
            if (city)
                query.andWhere({ city });
            return query;
        });
    }
    findLatest(city) {
        return __awaiter(this, void 0, void 0, function* () {
            const sub = this.db('village_population')
                .select('city', 'district', 'village')
                .max('year_month as max_ym')
                .groupBy('city', 'district', 'village')
                .as('latest');
            const query = this.db('village_population as v')
                .select('v.year_month', 'v.city', 'v.district', 'v.village', 'v.households', 'v.population', 'v.male', 'v.female')
                .join(sub, function () {
                this.on('v.city', 'latest.city')
                    .andOn('v.district', 'latest.district')
                    .andOn('v.village', 'latest.village')
                    .andOn('v.year_month', 'latest.max_ym');
            })
                .orderBy(['v.city', 'v.district', 'v.village']);
            if (city)
                query.andWhere('v.city', city);
            return query;
        });
    }
}
exports.VillagePopulationRepository = VillagePopulationRepository;
