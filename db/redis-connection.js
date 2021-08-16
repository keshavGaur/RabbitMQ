
const redis = require('redis');
const IoRedis = require('ioredis');
const config = require('config');
const redisConfig = config.get('db').redis;

let redisSingletonClient = null;
let redisIoSingletonClient = null;

/**
 * Provides connection to Redis Server
 * @returns {String} connection to redis sevrer
 */
async function getRedisClient() {
    if (redisSingletonClient && redisSingletonClient.connected) {
        return redisSingletonClient;
    }
    redisSingletonClient = redis.createClient(redisConfig);
    redisSingletonClient.on('error', (err) => {
        console.error('Error in connecting to Redis', { stack: err });
        return null;
    });
    return new Promise((resolve) => {
        redisSingletonClient.on('ready', async () => {
            resolve(redisSingletonClient);
        });
    });
}

/**
 * Provides connection to Redis Server
 * @returns {String} connection to redis sevrer
 */
async function getIoRedisClient() {
    if (redisIoSingletonClient && redisIoSingletonClient.connected) {
        return redisIoSingletonClient;
    }
    redisIoSingletonClient = new IoRedis(redisConfig);

    return redisIoSingletonClient;
}

module.exports = {
    getRedisClient,
    getIoRedisClient,
};
