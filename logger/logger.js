const bunyan = require('bunyan'); // Logging module
const fs = require('fs');

require("dotenv").config();
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const logConf = config.logger;
const { BunyanStreamInterceptor } = require('../helpers/interceptors');

const appLogConf = logConf.bunyan;

const loggerSession = createNamespace(appLogConf.name);

const { logDir } = logConf;

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const bunyanStream = logConf.apiLogsRedirectToStdout
    ? process.stdout : new bunyan.RotatingFileStream(appLogConf);

const internalLogger = bunyan.createLogger({
    name: appLogConf.name,
    level: logConf.logLevel,
    streams: [
        {
            type: 'raw',
            stream: new BunyanStreamInterceptor(bunyanStream),
        },
    ],
});


/**
 * Object to be used for logging
 * @returns {void}
 */
function Logger() { }


Object.keys(bunyan.levelFromName).forEach((name) => {
    Logger.prototype[name] = function getFunc(error, ...any) {
        if (logConf.disableApiLogs) return function noLogging() { };
        if (!error) return internalLogger[name]();

        return internalLogger[name](error, ...any);
    };
});


// Logger.prototype.createLogSessionForRequest = function createLogSessionForRequest(req, res, next) {
//     loggerSession.bindEmitter(req);
//     loggerSession.run(() => {
//         loggerSession.set('transactionId', req && req.headers ? req.headers[constants.X_TRANSACTION_ID_HEADER] : undefined);
//         next();
//     });
// };

Logger.prototype.logUncaughtException = function handleUncaughtException(err) {
    return new Promise((resolve, reject) => {
        const stream = bunyanStream.stream || bunyanStream;
        this.fatal(err);
        if (typeof (stream) !== 'object') return;
        // throw the original exception once stream is closed
        stream.on('finish', () => {
            resolve();
        });
        // close stream, flush buffer to disk
        stream.end();
    });
};

module.exports = new Logger();
