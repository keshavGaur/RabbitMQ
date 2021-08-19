// API server default configuration
// Sensitive information will be read from process

const defer = require('config/defer').deferConfig;
const path = require('path');
const p = require('../package.json');

const logDir = process.env.LOG_DIR || './logs';
const apiLogFileName = process.env.API_LOG_FILE_NAME || 'api.log';

module.exports = {
    app: {
        name: p.name,
        description: p.description,
    },
    env: {
        mode: process.env.NODE_ENV || 'development',
    },
    db: {
        mysql: {
            pool: {
                host: process.env.MYSQL_DB_SERVER,
                user: process.env.MYSQL_DB_USER,
                password: process.env.MYSQL_DB_PASSWORD,
                database: process.env.MYSQL_DB_NAME,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                multipleStatements: true,
            },
        },
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT
        }
    },
    logger: {
        logDir,
        disableApiLogs: process.env.DISABLE_API_LOGS === '1',
        logLevel: process.env.LOG_LEVEL || 'info',
        apiLogFileName,
        apiLogsRedirectToStdout: process.env.API_LOGS_REDIRECT_TO_STDOUT === '1',
        bunyan: {
            name: p.name,
            type: 'rotating-file',
            path: path.resolve(logDir, apiLogFileName), // log to a file
            period: '1d', // daily rotation
            count: 10,
        },
    },
};
