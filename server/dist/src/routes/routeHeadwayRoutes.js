"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const RouteHeadwayRepository_1 = require("../repositories/RouteHeadwayRepository");
const RouteHeadwayService_1 = require("../services/RouteHeadwayService");
const RouteHeadwayController_1 = require("../controllers/RouteHeadwayController");
const router = (0, express_1.Router)();
const repo = new RouteHeadwayRepository_1.RouteHeadwayRepository(database_1.default);
const service = new RouteHeadwayService_1.RouteHeadwayService(repo);
const controller = new RouteHeadwayController_1.RouteHeadwayController(service);
router.get('/', controller.getAll);
router.get('/:routeId', controller.getByRouteId);
exports.default = router;
