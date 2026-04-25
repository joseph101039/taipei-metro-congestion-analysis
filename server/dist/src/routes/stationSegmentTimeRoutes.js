"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const StationSegmentTimeRepository_1 = require("../repositories/StationSegmentTimeRepository");
const StationSegmentTimeService_1 = require("../services/StationSegmentTimeService");
const StationSegmentTimeController_1 = require("../controllers/StationSegmentTimeController");
const router = (0, express_1.Router)();
const repo = new StationSegmentTimeRepository_1.StationSegmentTimeRepository(database_1.default);
const service = new StationSegmentTimeService_1.StationSegmentTimeService(repo);
const controller = new StationSegmentTimeController_1.StationSegmentTimeController(service);
router.get('/', controller.getAll);
router.get('/:from/:to', controller.getBySegment);
exports.default = router;
