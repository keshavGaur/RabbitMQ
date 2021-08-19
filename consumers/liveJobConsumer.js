/**
 * retry model is build with taking inspiration from
 * https://blog.forma-pro.com/rabbitmq-retries-on-node-js-1f82c6afc1a1
*/

const amqp = require('amqplib');
const logger = require('./../logger');
const service = require('./../services/liveJobCaching');
const helper = require('./../helpers/retryHelper');
const MAX_RETRIES = 3;

/**
 * resends msg to ttl queues for retry
 * @param {*} reasonOfFail 
 * @returns 
*/
function handleRejectedMsg(reasonOfFail, msg, channel) {
    return sendMsgToRetry({ msg, queue: 'job_exchange_queue', channel, reasonOfFail });
}

/**
 * publishes msg to ttl queue
 * @param {Object} args - message arguments
 * @returns 
*/
function sendMsgToRetry(args) {
    const channel = args.channel;
    const queue = args.queue;
    const msg = args.msg;

    // ack original msg
    channel.ack(msg);

    const { attempt, content } = helper.getAttemptAndUpdatedContent(msg);

    if (attempt <= MAX_RETRIES) {
        const routingKey = `retry-${attempt}`;
        const options = {
            contentEncoding: 'utf8',
            contentType: 'application/json',
            persistent: true,
        };

        Object.keys(msg.properties).forEach(key => {
            options[key] = msg.properties[key];
        });

        return channel.publish('TTL-job_exchange', routingKey, content, options);
    } else {
        logger.error('attempt is greater than MAX_RETRIES, jobId - ');
        //enter into lazy queue or something
    }
}

const connect = async () => {
    try {
        const amqpServer = "amqp://localhost:5672"
        const connection = await amqp.connect(amqpServer)
        const channel = await connection.createChannel();

        const exchanges = await assertExchanges(channel);
        const queues = await assertQueues(channel);
        const bindings = await bindExchangesToQueues(channel);

        channel.consume('job_exchange_queue', msg => {
            const data = JSON.parse(msg.content.toString());
            const jobId = data && data[0] && data[0].jobId || 0;

            if (jobId > 0) {
                return (new Promise(async (resolve, reject) => {
                    try {
                        await service.updateJob(jobId);
                        resolve();
                    } catch (ex) {
                        reject(ex);
                    }
                })).then(() => {
                    channel.ack(msg);
                }).catch((e) => {
                    logger.error(e);
                    handleRejectedMsg(e, msg, channel);
                });
            }
        });
    } catch (ex) {
        logger.error(ex);
    }

}

function assertExchanges(channel) {
    return Promise.all([]
        .concat(channel.assertExchange('job_exchange', 'direct', { durable: true }))
        .concat(channel.assertExchange('TTL-job_exchange', 'direct', { durable: true }))
        .concat(channel.assertExchange('DLX-job_exchange', 'fanout', { durable: true }))
    );
}

function assertQueues(channel) {
    return Promise.all([]
        .concat(channel.assertQueue('job_exchange_queue', { durable: true }))
        .concat([
            channel.assertQueue('job_exchange-retry-1-30s', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 30000 }),
            channel.assertQueue('job_exchange-retry-2-60s', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 60000 }),
            channel.assertQueue('job_exchange-retry-3-120s', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 120000 }),
        ])
    );
}

function bindExchangesToQueues(channel) {
    return Promise.all([]
        .concat(channel.bindQueue('job_exchange_queue', 'job_exchange', 'job_exchange'))
        .concat(channel.bindQueue('job_exchange_queue', 'DLX-job_exchange'))
        .concat(
            channel.bindQueue('job_exchange-retry-1-30s', 'TTL-job_exchange', 'retry-1'),
            channel.bindQueue('job_exchange-retry-2-60s', 'TTL-job_exchange', 'retry-2'),
            channel.bindQueue('job_exchange-retry-3-120s', 'TTL-job_exchange', 'retry-3')
        )
    );
}

module.exports = {
    connect,
}