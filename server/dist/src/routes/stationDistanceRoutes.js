"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const StationDistanceRepository_1 = require("../repositories/StationDistanceRepository");
const StationDistanceService_1 = require("../services/StationDistanceService");
const StationDistanceController_1 = require("../controllers/StationDistanceController");
const router = (0, express_1.Router)();
const repo = new StationDistanceRepository_1.StationDistanceRepository(database_1.default);
const service = new StationDistanceService_1.StationDistanceService(repo);
const controller = new StationDistanceController_1.StationDistanceController(service);
router.get('/', controller.getDistances);
exports.default = router;
