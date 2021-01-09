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
exports.getSession = exports.deleteSession = exports.saveSession = exports.createDatabaseFile = void 0;
const fs_1 = __importDefault(require("fs"));
const fileUtils_1 = require("./fileUtils");
function getSessionsFromDB(filename) {
    const data = fs_1.default.readFileSync(fileUtils_1.fileLocation(filename));
    return JSON.parse(data.toString());
}
function createDatabaseFile(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        fs_1.default.writeFileSync(fileUtils_1.fileLocation(filename), JSON.stringify([]));
    });
}
exports.createDatabaseFile = createDatabaseFile;
/** Saves new session to db, ingores if new is already exists */
function saveSession(session, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        let sessions = getSessionsFromDB(filename);
        if (sessions.find((s) => s.keyword == session.keyword)) {
            sessions = sessions.filter((s) => s.keyword != session.keyword);
        }
        sessions.push(session);
        fs_1.default.writeFileSync(fileUtils_1.fileLocation(filename), JSON.stringify(sessions), {
            flag: "w+",
        });
    });
}
exports.saveSession = saveSession;
function deleteSession(keyword, filename) {
    let sessions = getSessionsFromDB(filename);
    sessions = sessions.filter((s) => s.keyword != keyword);
    fs_1.default.writeFileSync(fileUtils_1.fileLocation(filename), JSON.stringify(sessions), {
        flag: "w+",
    });
}
exports.deleteSession = deleteSession;
function getSession(keyword, filename) {
    let sessions = getSessionsFromDB(filename);
    const s = sessions.find((s) => s.keyword == keyword);
    if (s)
        return s;
    else
        return null;
}
exports.getSession = getSession;
