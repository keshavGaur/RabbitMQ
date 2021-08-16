// API server default configuration
// Sensitive information will be read from process


module.exports = {
    logger: {
        app: {
            level: process.env.LOG_LEVEL || 'debug',
            logDestination: 'stdout',
        },
    },
};
