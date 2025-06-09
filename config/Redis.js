require('dotenv').config({path: '../.env'});
const IORedis = require('ioredis');

function createRedisConnection() {
    console.log(process.env.REDIS_HOST)
  return new IORedis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
});

}

module.exports = createRedisConnection;