import redis from "redis";
import { promisify } from "util";
import { logger } from "./logger";

const redisClient = redis.createClient({ prefix: "qiwidaemon:" });

// Promisifying function to get Async / await support instread of callbacks
const redisGet = promisify(redisClient.get).bind(redisClient);
const redisSet = promisify(redisClient.set).bind(redisClient);

export { redisClient, redisGet, redisSet };
