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
const StationDistanceController_1 = require("../controllers/StationDistanceController");
const mockRecord = {
    id: 1,
    from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
    to_station: { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
    distance_km: 2.09,
};
const makeReq = (query = {}) => ({ query });
const makeRes = () => {
    const res = { json: jest.fn(), status: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
};
const makeNext = () => jest.fn();
const makeService = (records = [mockRecord]) => ({
    getDistances: jest.fn().mockResolvedValue(records),
});
describe('StationDistanceController', () => {
    it('responds with { data } on success', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = makeService();
        const controller = new StationDistanceController_1.StationDistanceController(service);
        const req = makeReq();
        const res = makeRes();
        yield controller.getDistances(req, res, makeNext());
        expect(res.json).toHaveBeenCalledWith({ data: [mockRecord] });
    }));
    it('extracts from_code query param', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = makeService();
        const controller = new StationDistanceController_1.StationDistanceController(service);
        yield controller.getDistances(makeReq({ from_code: 'R28' }), makeRes(), makeNext());
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ from_code: 'R28' }));
    }));
    it('extracts from_name query param', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = makeService();
        const controller = new StationDistanceController_1.StationDistanceController(service);
        yield controller.getDistances(makeReq({ from_name: '淡水' }), makeRes(), makeNext());
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ from_name: '淡水' }));
    }));
    it('extracts to_code and to_name query params', () => __awaiter(void 0, void 0, void 0, function* () {
        const service = makeService();
        const controller = new StationDistanceController_1.StationDistanceController(service);
        yield controller.getDistances(makeReq({ to_code: 'R27', to_name: '紅樹林' }), makeRes(), makeNext());
        expect(service.getDistances).toHaveBeenCalledWith(expect.objectContaining({ to_code: 'R27', to_name: '紅樹林' }));
    }));
    it('calls next with error on service failure', () => __awaiter(void 0, void 0, void 0, function* () {
        const error = new Error('db error');
        const service = { getDistances: jest.fn().mockRejectedValue(error) };
        const controller = new StationDistanceController_1.StationDistanceController(service);
        const next = makeNext();
        yield controller.getDistances(makeReq(), makeRes(), next);
        expect(next).toHaveBeenCalledWith(error);
    }));
});
