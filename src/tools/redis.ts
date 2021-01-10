import redis from "redis";
import { env } from "./env";
import { logger } from "./logger";

const envPrefix = env("REDIS_PREFIX", false);
// Setting prefix to default value if not set in env
const prefix = envPrefix != "" ? envPrefix : "qiwidaemon:";

class QiwiDaemonRedis {
    public client: redis.RedisClient;

    constructor() {
        logger.debug(`Prefix "${prefix}" will be used for Redis (if using redis)`);

        try {
            this.client = redis.createClient({ prefix });            
        } catch (error) {
            logger.error("Failed to connect to Redis.");
            throw error;
        }
    }

    // * I make promises out of callback functions
    asyncGet(key: string): Promise<string | null> {
        return new Promise((res, rej) => {
            this.client.get(key, (err, reply) => {
                if (err) rej(err);
                res(reply);
            });
        });
    }

    asyncSet(key: string, value: string): Promise<void> {
        return new Promise((res, rej) => {
            this.client.set(key, value, (err, reply) => {
                if (err) rej(err);
                else res();
            });
        });
    }
}

export { QiwiDaemonRedis };
