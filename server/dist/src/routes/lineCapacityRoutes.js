"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const LineCapacityRepository_1 = require("../repositories/LineCapacityRepository");
const LineCapacityService_1 = require("../services/LineCapacityService");
const LineCapacityController_1 = require("../controllers/LineCapacityController");
const router = (0, express_1.Router)();
const repo = new LineCapacityRepository_1.LineCapacityRepository(database_1.default);
const service = new LineCapacityService_1.LineCapacityService(repo);
const controller = new LineCapacityController_1.LineCapacityController(service);
router.get('/', controller.getAll);
exports.default = router;
