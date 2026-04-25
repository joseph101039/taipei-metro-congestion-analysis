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
const StationDistanceService_1 = require("../services/StationDistanceService");
const mockRecord = {
    id: 1,
    from_station: { id: 1, code: 'R28', name: '淡水', alias: '淡水' },
    to_station: { id: 2, code: 'R27', name: '紅樹林', alias: '紅樹林' },
    distance_km: 2.09,
};
const makeRepo = (records = [mockRecord]) => ({
    findAll: jest.fn().mockResolvedValue(records),
});
describe('StationDistanceService', () => {
    it('returns all distances when no filter given', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo();
        const service = new StationDistanceService_1.StationDistanceService(repo);
        const result = yield service.getDistances({});
        expect(repo.findAll).toHaveBeenCalledWith({});
        expect(result).toEqual([mockRecord]);
    }));
    it('passes from_code filter to repo', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo();
        const service = new StationDistanceService_1.StationDistanceService(repo);
        yield service.getDistances({ from_code: 'R28' });
        expect(repo.findAll).toHaveBeenCalledWith({ from_code: 'R28' });
    }));
    it('passes from_name filter to repo', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo();
        const service = new StationDistanceService_1.StationDistanceService(repo);
        yield service.getDistances({ from_name: '淡水' });
        expect(repo.findAll).toHaveBeenCalledWith({ from_name: '淡水' });
    }));
    it('passes to_code filter to repo', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo();
        const service = new StationDistanceService_1.StationDistanceService(repo);
        yield service.getDistances({ to_code: 'R27' });
        expect(repo.findAll).toHaveBeenCalledWith({ to_code: 'R27' });
    }));
    it('passes to_name filter to repo', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo();
        const service = new StationDistanceService_1.StationDistanceService(repo);
        yield service.getDistances({ to_name: '紅樹林' });
        expect(repo.findAll).toHaveBeenCalledWith({ to_name: '紅樹林' });
    }));
    it('returns empty array when repo returns none', () => __awaiter(void 0, void 0, void 0, function* () {
        const repo = makeRepo([]);
        const service = new StationDistanceService_1.StationDistanceService(repo);
        const result = yield service.getDistances({ from_code: 'INVALID' });
        expect(result).toEqual([]);
    }));
});
