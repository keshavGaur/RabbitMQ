// API server default configuration
// non Sensitive instance specific information will come here
// add config which overriddes the default.js config keys


module.exports = {
    logger: {
        app: {
            level: process.env.LOG_LEVEL || 'debug',
        },
    },
};
    