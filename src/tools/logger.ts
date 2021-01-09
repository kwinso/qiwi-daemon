import { env } from "./env";
import winston, { format } from "winston";

const timeformat = "YYYY-MM-DD HH:mm:ss";
const isDebugMode = env("DEBUG", false) == "true";
const loggerDisabled = env("NO_LOGS", false) == "true";

interface LogOptions {
    infoLevel: winston.LoggerOptions;
    errorLevel: winston.LoggerOptions;
    qiwiLevel: winston.transports.FileTransportOptions;
}

const infoFormat = format.printf(({ level, message, label, timestamp }) => {
    return `[${label}] ${timestamp} ${level}: ${message}`;
});

const paymentLogFormat = format.printf(({ message, timestamp }) => {
    return `[${timestamp}] ${message}`;
});

const defaultLogginFormat: winston.Logform.Format = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: timeformat }),
    winston.format.label({ label: "QIWI Daemon" }),
    infoFormat
);
const loggingOptions: LogOptions = {
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
        format: winston.format.combine(winston.format.timestamp({ format: timeformat }), paymentLogFormat),
        filename: "qiwi-daemon.log" 
    },
};

const logger = winston.createLogger({
    silent: loggerDisabled,

    transports: [
        new winston.transports.Console({
            ...loggingOptions.infoLevel,
            level: isDebugMode ? "debug" : "info",
        }),
    ],
});

if (isDebugMode) logger.debug("Welcome to debug mode. Be carefull, there might be logged some personal data.");

const transactionsLogger = winston.createLogger({
    silent: loggerDisabled,
    transports: loggerDisabled ? undefined : [
        new winston.transports.File(loggingOptions.qiwiLevel),
    ],
});

export { logger, transactionsLogger };
