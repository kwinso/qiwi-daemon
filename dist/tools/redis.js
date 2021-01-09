"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSet = exports.redisGet = exports.redisClient = void 0;
const redis_1 = __importDefault(require("redis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
const envPrefix = env_1.env("REDIS_PREFIX", false);
// Setting prefix to default value if not set in env
const prefix = envPrefix != "" ? envPrefix : "qiwidaemon:";
logger_1.logger.debug(`Prefix ${prefix} will be used for Redis (if using redis)`);
const redisClient = redis_1.default.createClient({ prefix });
exports.redisClient = redisClient;
// * I make promises out of callback functions
function redisGet(key) {
    return new Promise((res, rej) => {
        redisClient.get(key, (err, reply) => {
            if (err)
                rej(err);
            res(reply);
        });
    });
}
exports.redisGet = redisGet;
function redisSet(key, value) {
    return new Promise((res, rej) => {
        redisClient.set(key, value, (err, reply) => {
            if (err)
                rej(err);
            else
                res();
        });
    });
}
exports.redisSet = redisSet;
