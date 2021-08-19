const contentEncoding = 'utf8';

/**
 * unpacks content adds attempt and pack it again
 * @param {Buffer} msg 
 * @returns {Object} containing { attempt, content }
 */
const getAttemptAndUpdatedContent = (msg) => {
    let content = JSON.parse(msg.content.toString(contentEncoding));
    if (Array.isArray(content)) {
        content[0].try_attempt = content[0]
            && content[0].try_attempt
            && ++content[0].try_attempt || 1;

        const attempt = content[0].try_attempt;
        content = Buffer.from(JSON.stringify(content), contentEncoding);

        return { attempt, content };
    }
}

module.exports = {
    getAttemptAndUpdatedContent,
}