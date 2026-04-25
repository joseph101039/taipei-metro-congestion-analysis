"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const VillagePopulationRepository_1 = require("../repositories/VillagePopulationRepository");
const VillagePopulationService_1 = require("../services/VillagePopulationService");
const VillagePopulationController_1 = require("../controllers/VillagePopulationController");
const router = (0, express_1.Router)();
const repo = new VillagePopulationRepository_1.VillagePopulationRepository(database_1.default);
const service = new VillagePopulationService_1.VillagePopulationService(repo);
const controller = new VillagePopulationController_1.VillagePopulationController(service);
router.get('/village-density', controller.getVillagePopulation);
router.get('/village-boundaries', controller.getVillageBoundaries);
exports.default = router;
