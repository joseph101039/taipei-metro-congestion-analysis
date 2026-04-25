"use strict";
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config = {
    development: {
        client: 'mysql2',
        connection: {
            host: (_a = process.env.DB_HOST) !== null && _a !== void 0 ? _a : '127.0.0.1',
            port: Number((_b = process.env.DB_PORT) !== null && _b !== void 0 ? _b : 3306),
            user: (_c = process.env.DB_USER) !== null && _c !== void 0 ? _c : 'root',
            password: (_d = process.env.DB_PASSWORD) !== null && _d !== void 0 ? _d : '',
            database: (_e = process.env.DB_NAME) !== null && _e !== void 0 ? _e : 'metro',
        },
        migrations: {
            directory: './migrations',
            extension: 'ts',
        },
        seeds: {
            directory: './seeds',
            extension: 'ts',
        },
    },
    production: {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            port: Number((_f = process.env.DB_PORT) !== null && _f !== void 0 ? _f : 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        },
        migrations: {
            directory: './migrations',
            extension: 'ts',
        },
        pool: { min: 2, max: 10 },
    },
};
exports.default = config;
