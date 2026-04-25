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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VillagePopulationController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BOUNDARY_PATH = path_1.default.join(process.cwd(), 'public/data/twvillage-taipei.json');
let boundaryCache = null;
function loadBoundaries() {
    if (!boundaryCache) {
        boundaryCache = JSON.parse(fs_1.default.readFileSync(BOUNDARY_PATH, 'utf-8'));
    }
    return boundaryCache;
}
class VillagePopulationController {
    constructor(service) {
        this.service = service;
        this.getVillagePopulation = this.getVillagePopulation.bind(this);
        this.getVillageBoundaries = this.getVillageBoundaries.bind(this);
    }
    getVillagePopulation(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { year_month, city } = req.query;
                if (year_month !== undefined) {
                    const ym = parseInt(year_month, 10);
                    if (isNaN(ym) || String(ym).length !== 6) {
                        res.status(400).json({ error: "'year_month' must be a 6-digit integer (YYYYMM)" });
                        return;
                    }
                    const result = yield this.service.getByYearMonth(ym, city);
                    res.json(result);
                    return;
                }
                const result = yield this.service.getLatest(city);
                if (!result) {
                    res.status(404).json({ error: 'No population data found' });
                    return;
                }
                res.json(result);
            }
            catch (err) {
                next(err);
            }
        });
    }
    getVillageBoundaries(_req, res, next) {
        try {
            if (!fs_1.default.existsSync(BOUNDARY_PATH)) {
                res.status(404).json({ error: 'Village boundary file not found' });
                return;
            }
            const { features } = loadBoundaries();
            const out = features.map((f) => ({
                type: 'Feature',
                geometry: f.geometry,
                properties: {
                    county: f.properties.county,
                    district: f.properties.town,
                    village: f.properties.village,
                    area_km2: Math.round((f.properties.shape_area / 1000000) * 10000) / 10000,
                },
            }));
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.json({ type: 'FeatureCollection', features: out });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VillagePopulationController = VillagePopulationController;
