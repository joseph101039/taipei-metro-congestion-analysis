"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const TransferOverheadRepository_1 = require("../repositories/TransferOverheadRepository");
const TransferOverheadService_1 = require("../services/TransferOverheadService");
const TransferOverheadController_1 = require("../controllers/TransferOverheadController");
const router = (0, express_1.Router)();
const repo = new TransferOverheadRepository_1.TransferOverheadRepository(database_1.default);
const service = new TransferOverheadService_1.TransferOverheadService(repo);
const controller = new TransferOverheadController_1.TransferOverheadController(service);
router.get('/', controller.getAll);
router.get('/:sid', controller.getBySid);
exports.default = router;
