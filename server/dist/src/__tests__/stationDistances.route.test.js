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
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const express_2 = require("express");
const StationDistanceController_1 = require("../controllers/StationDistanceController");
const mockRecord = {
    id: 1,
    from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
    to_station: { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
    distance_km: 2.09,
};
function buildApp(service) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const router = (0, express_2.Router)();
    const controller = new StationDistanceController_1.StationDistanceController(service);
    router.get('/', controller.getDistances);
    app.use('/api/station-distances', router);
    return app;
}
describe('GET /api/station-distances', () => {
    it('returns 200 with data array', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
        const app = buildApp(service);
        const res = yield (0, supertest_1.default)(app).get('/api/station-distances');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: [mockRecord] });
    }));
    it('forwards from_code query param to service', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
        const app = buildApp(service);
        yield (0, supertest_1.default)(app).get('/api/station-distances?from_code=R28');
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ from_code: 'R28' }));
    }));
    it('forwards from_name query param to service', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = { getDistances: jest.fn().mockResolvedValue([mockRecord]) };
        const app = buildApp(service);
        yield (0, supertest_1.default)(app).get('/api/station-distances?from_name=%E6%B7%A1%E6%B0%B4');
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ from_name: '淡水' }));
    }));
    it('forwards to_code query param to service', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = { getDistances: jest.fn().mockResolvedValue([]) };
        const app = buildApp(service);
        yield (0, supertest_1.default)(app).get('/api/station-distances?to_code=R27');
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ to_code: 'R27' }));
    }));
    it('returns empty data for unknown code', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = { getDistances: jest.fn().mockResolvedValue([]) };
        const app = buildApp(service);
        const res = yield (0, supertest_1.default)(app).get('/api/station-distances?from_code=INVALID');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: [] });
    }));
    it('returns 500 on service error', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = {
            getDistances: jest.fn().mockRejectedValue(new Error('db error')),
        };
        const app = buildApp(service);
        app.use((_err, _req, res, _next) => {
            res.status(500).json({ error: 'Internal server error' });
        });
        const res = yield (0, supertest_1.default)(app).get('/api/station-distances');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    }));
});
