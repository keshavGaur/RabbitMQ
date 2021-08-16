// API server default configuration
// Sensitive information will be read from process

const defer = require('config/defer').deferConfig;
const p = require('./../package.json');

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
        app: {
            silent: process.env.ENABLE_APP_LOGS === '0',
            level: process.env.LOG_LEVEL || 'debug',
            logDestination: appLogDestination,
            fileParams: {
                fileName: apiLogFileName,
                fileRotation: true,
                interval: '1d',
                maxFiles: 10,
            },
        },
    },
};
