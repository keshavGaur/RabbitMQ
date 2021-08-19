/**
 * retry model is build with taking inspiration from
 * https://blog.forma-pro.com/rabbitmq-retries-on-node-js-1f82c6afc1a1
*/

const amqp = require('amqplib');
const service = require('./../services/liveJobCaching');
const contentEncoding = 'utf8';
const contentTypeJson = 'application/json';

function handler() {
    return Math.random() > 0.5 ? Promise.resolve() : Promise.reject()
}

function sendMsgToRetry(args) {
    const channel = args.channel;
    const queue = args.queue;
    const msg = args.msg;

    // ack original msg
    channel.ack(msg);

    // Unpack content, update and pack it back
    function getAttemptAndUpdatedContent(msg) {
        let content = JSON.parse(msg.content.toString(contentEncoding));
        content.try_attempt = ++content.try_attempt || 1;
        const attempt = content.try_attempt;
        content = Buffer.from(JSON.stringify(content), contentEncoding);

        return { attempt, content };
    }

    const { attempt, content } = getAttemptAndUpdatedContent(msg);

    if (attempt <= 3) {
        const routingKey = `retry-${attempt}`;
        const options = {
            contentEncoding,
            contentType: contentTypeJson,
            persistent: true,
        };

        Object.keys(msg.properties).forEach(key => {
            options[key] = msg.properties[key];
        });

        return channel.publish('TTL-job_exchange', routingKey, content, options);
    }

    return Promise.resolve();
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
            console.log(JSON.parse(msg.content.toString()));

            return (new Promise(async (resolve, reject) => {
                if (msg.fields.redelivered) {
                    reject('Message was redelivered, so something wrong happened');
                    return;
                }

                try {
                    await handler(msg, channel)
                    resolve();
                } catch (ex) {
                    reject();
                }
            })).then(() => {
                channel.ack(msg);
            }).catch(handleRejectedMsg);

            function handleRejectedMsg(reasonOfFail) {
                return sendMsgToRetry({ msg, queue: 'job_exchange_queue', channel, reasonOfFail });
            }
        });
    } catch (ex) {
        console.log(ex);
    }

}

function assertExchanges(channel) {
    return Promise.all([]
        .concat(channel.assertExchange('job_exchange', 'direct', { durable: true }))
        .concat(channel.assertExchange('TTL-job_exchange', 'direct', { durable: true }))
        .concat(channel.assertExchange('DLX-job_exchange', 'direct', { durable: true }))
    );
}

function assertQueues(channel) {
    return Promise.all([]
        .concat(channel.assertQueue('job_exchange_queue', { durable: true }))
        .concat([
            channel.assertQueue('job_exchange-retry-1-30s', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 30000 }),
            channel.assertQueue('job_exchange-retry-2-10m', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 600000 }),
            channel.assertQueue('job_exchange-retry-3-20m', { durable: true, deadLetterExchange: 'DLX-job_exchange', messageTtl: 1200000 }),
        ])
    );
}

function bindExchangesToQueues(channel) {
    return Promise.all([]
        .concat(channel.bindQueue('job_exchange_queue', 'job_exchange', 'job_exchange'))
        .concat(channel.bindQueue('job_exchange_queue', 'DLX-job_exchange', 'DLX-job_exchange'))
        .concat(
            channel.bindQueue('job_exchange-retry-1-30s', 'TTL-job_exchange', 'retry-1'),
            channel.bindQueue('job_exchange-retry-2-10m', 'TTL-job_exchange', 'retry-2'),
            channel.bindQueue('job_exchange-retry-3-20m', 'TTL-job_exchange', 'retry-3')
        )
    );

    // channel.consume(q.queue, function (msg) {
    //     console.log(" [x] %s: '%s'", msg.fields.routingKey, msg.content.toString());
    //     channel.ack(msg);
    // });
}

module.exports = {
    connect,
}