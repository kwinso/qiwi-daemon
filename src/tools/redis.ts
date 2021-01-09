import redis from "redis";
import { env } from "./env";
import { logger } from "./logger";

const envPrefix = env("REDIS_PREFIX", false);
// Setting prefix to default value if not set in env
const prefix =  envPrefix != "" ? envPrefix : "qiwidaemon:";

logger.debug(`Prefix ${prefix} will be used for Redis (if using redis)`);

const redisClient = redis.createClient({ prefix });


// * I make promises out of callback functions
function redisGet(key: string): Promise<string | null> {
    return new Promise((res, rej) => {
        redisClient.get(key, (err, reply) => {
            if (err) rej(err);
            res(reply);
        });
    });
}

function redisSet(key: string, value: string): Promise<void> {
    return new Promise((res, rej) => {
        redisClient.set(key, value, (err, reply) => {
            if (err) rej(err);
            else res();
        });
    });
}

export { redisClient, redisGet, redisSet };
