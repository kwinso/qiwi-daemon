"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsLogger = exports.logger = void 0;
const env_1 = require("./env");
const winston_1 = __importStar(require("winston"));
const timeformat = "YYYY-MM-DD HH:mm:ss";
const isDebugMode = env_1.env("DEBUG", false) == "true";
const loggerDisabled = env_1.env("NO_LOGS", false) == "true";
const infoFormat = winston_1.format.printf(({ level, message, label, timestamp }) => {
    return `[${label}] ${timestamp} ${level}: ${message}`;
});
const paymentLogFormat = winston_1.format.printf(({ message, timestamp }) => {
    return `[${timestamp}] ${message}`;
});
const defaultLogginFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: timeformat }), winston_1.default.format.label({ label: "QIWI Daemon" }), infoFormat);
const loggingOptions = {
    infoLevel: {
        level: "info",
        format: defaultLogginFormat,
    },
    errorLevel: {
        level: "error",
        format: defaultLogginFormat,
    },
    qiwiLevel: {
        level: "info",
        format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: timeformat }), paymentLogFormat),
        filename: "qiwi-daemon.log",
    },
};
const logger = winston_1.default.createLogger({
    silent: loggerDisabled,
    transports: [
        new winston_1.default.transports.Console(Object.assign(Object.assign({}, loggingOptions.infoLevel), { level: isDebugMode ? "debug" : "info" })),
    ],
});
exports.logger = logger;
if (isDebugMode)
    logger.debug("Welcome to debug mode. Be carefull, there might be logged some personal data.");
const paymentsLogger = winston_1.default.createLogger({
    silent: loggerDisabled,
    transports: [new winston_1.default.transports.File(loggingOptions.qiwiLevel)],
});
exports.paymentsLogger = paymentsLogger;
