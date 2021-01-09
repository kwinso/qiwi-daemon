"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envCheck = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
dotenv_1.default.config({ path: ".qiwi.env" });
const isDebugMode = env("DEBUG", false) == "true";
const requiredVars = ["PAYMENT_AMOUNT", "QIWI_TOKEN", "PHONE_NUMBER"];
function env(name, required = true) {
    const value = process.env[name];
    if (!value) {
        if (!required)
            return "";
        logger_1.logger.error(`Failed to find env variable '${name}'`);
        if (isDebugMode) {
            console.error(new Error(`Missing required env variable '${name}'.`));
        }
        process.exit(1);
    }
    return value;
}
exports.env = env;
function envCheck() {
    requiredVars.forEach((v) => env(v));
}
exports.envCheck = envCheck;
