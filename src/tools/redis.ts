import redis from "redis";

const redisClient = redis.createClient({ prefix: "qiwidaemon:" });


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
