"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const RidershipRepository_1 = require("../repositories/RidershipRepository");
const RidershipService_1 = require("../services/RidershipService");
const RidershipController_1 = require("../controllers/RidershipController");
const router = (0, express_1.Router)();
const repo = new RidershipRepository_1.RidershipRepository(database_1.default);
const service = new RidershipService_1.RidershipService(repo);
const controller = new RidershipController_1.RidershipController(service);
router.get('/', controller.getSnapshot);
router.get('/flows', controller.getFlows);
exports.default = router;
