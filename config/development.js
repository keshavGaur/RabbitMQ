// API server default configuration
// Sensitive information will be read from process

module.exports = {
    logger: {
        logLevel: process.env.LOG_LEVEL || 'info',
        accessLogsRedirectToStdout: false,
        apiLogsRedirectToStdout: false,
    },
};
