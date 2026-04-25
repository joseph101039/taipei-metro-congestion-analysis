"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const RouteRepository_1 = require("../repositories/RouteRepository");
const RouteTimeRepository_1 = require("../repositories/RouteTimeRepository");
const RouteTimeService_1 = require("../services/RouteTimeService");
const RouteTimeController_1 = require("../controllers/RouteTimeController");
const router = (0, express_1.Router)();
const routeRepo = new RouteRepository_1.RouteRepository(database_1.default);
const routeTimeRepo = new RouteTimeRepository_1.RouteTimeRepository(database_1.default);
const service = new RouteTimeService_1.RouteTimeService(routeTimeRepo, routeRepo);
const controller = new RouteTimeController_1.RouteTimeController(service);
router.get('/', controller.getRouteTime);
router.get('/transfers', controller.getTransferStations);
exports.default = router;
