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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileExists = exports.fileLocation = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * @param name - name of the file
 * @returns full path to the relative file by name */
function fileLocation(name) {
    return path_1.default.join(process.cwd(), name);
}
exports.fileLocation = fileLocation;
/**
 * @param filename -  Name of the file relative to the directory when programm was started
 */
function fileExists(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.default.existsSync(fileLocation(filename));
    });
}
exports.fileExists = fileExists;
