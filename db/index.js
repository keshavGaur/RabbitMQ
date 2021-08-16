const redis = require('./redis-connection');
const mysql = require('./mysql-connection');

const dbs = {
    mysql,
    redis,
};

module.exports = dbs;
