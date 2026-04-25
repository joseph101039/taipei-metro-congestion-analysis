"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const RouteRepository_1 = require("../repositories/RouteRepository");
const RouteService_1 = require("../services/RouteService");
const RouteController_1 = require("../controllers/RouteController");
const router = (0, express_1.Router)();
const repo = new RouteRepository_1.RouteRepository(database_1.default);
const service = new RouteService_1.RouteService(repo);
const controller = new RouteController_1.RouteController(service);
router.get('/', controller.getRoute);
exports.default = router;
