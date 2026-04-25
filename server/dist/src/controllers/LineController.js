"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineController = void 0;
class LineController {
    constructor(service) {
        this.service = service;
        this.getLines = this.getLines.bind(this);
        this.getLineByCode = this.getLineByCode.bind(this);
    }
    getLines(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield this.service.getAll();
                res.json({ data });
            }
            catch (err) {
                next(err);
            }
        });
    }
    getLineByCode(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const line = yield this.service.getByCode(req.params.code);
                if (!line) {
                    res.status(404).json({ error: 'Line not found' });
                    return;
                }
                res.json({ data: line });
            }
            catch (err) {
                next(err);
            }
        });
    }
}
exports.LineController = LineController;
