"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knexfile_1 = __importDefault(require("../../knexfile"));
const env = (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : 'development';
const db = (0, knex_1.default)(knexfile_1.default[env]);
exports.default = db;
