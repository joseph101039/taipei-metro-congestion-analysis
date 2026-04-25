"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const CongestionRepository_1 = require("../repositories/CongestionRepository");
const RoutePathService_1 = require("../services/RoutePathService");
const CongestionService_1 = require("../services/CongestionService");
const CongestionController_1 = require("../controllers/CongestionController");
const router = (0, express_1.Router)();
const repo = new CongestionRepository_1.CongestionRepository(database_1.default);
const routePathService = new RoutePathService_1.RoutePathService(repo);
const service = new CongestionService_1.CongestionService(repo, routePathService);
const controller = new CongestionController_1.CongestionController(service);
router.get('/station-load', controller.getStationLoad);
router.get('/station-load-range', controller.getStationLoadRange);
exports.default = router;
