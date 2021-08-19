// API server default configuration
// non Sensitive instance specific information will come here
// add config which overriddes the default.js config keys

module.exports = {
    logger: {
        logLevel: process.env.LOG_LEVEL || 'error',
    },
};
