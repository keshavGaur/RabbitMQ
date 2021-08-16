const config = require('config');
const mysql = require('mysql2');

const dbconfig = config.get('db.mysql');
const pool = mysql.createPool(dbconfig.pool);
const connectionPromise = pool.promise();

/**
 * this function return a new mysql client.
 * @returns {Object} - mysql client object
 */
async function getClient() {
    try {
        return await connectionPromise.getConnection();
    } catch (exception) {
        throw exception;
    }
}

module.exports = {
    connectionPromise,
    getClient,
    closeConnection: () => connectionPromise.end(),
};
