"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const StationRepository_1 = require("../repositories/StationRepository");
const StationService_1 = require("../services/StationService");
const StationController_1 = require("../controllers/StationController");
const router = (0, express_1.Router)();
const repo = new StationRepository_1.StationRepository(database_1.default);
const service = new StationService_1.StationService(repo);
const controller = new StationController_1.StationController(service);
router.get('/', controller.getStations);
router.get('/:code', controller.getStationByCode);
exports.default = router;
