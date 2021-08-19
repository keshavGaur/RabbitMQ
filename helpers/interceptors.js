const bunyan = require('bunyan');

const { safeCycles } = bunyan;

/**
 *Method to intercept log entry
 *
 * @param {Object} stream log entry stream
 * @returns {void}
 */
function BunyanStreamInterceptor(stream) {
    this.stream = stream;
}


BunyanStreamInterceptor.prototype.write = function write(rec) {
    // Change log level number to name
    const logRecord = rec;
    logRecord.level = bunyan.nameFromLevel[logRecord.level];
    logRecord.appCode = logRecord.name;
    logRecord.logTime = logRecord.time;
    logRecord.message = logRecord.msg;
    delete logRecord.name;
    delete logRecord.time;
    delete logRecord.msg;
    delete logRecord.v;
    const str = `${JSON.stringify(logRecord, safeCycles())}\n`;
    this.stream.write(str);
};

module.exports = {
    BunyanStreamInterceptor,
};
