const amqp = require('amqplib');

const jobId = process.argv[2];

const publish = async () => {
    const amqpServer = "amqp://localhost:5672"
    const connection = await amqp.connect(amqpServer);
    const channel = await connection.createChannel();
    const exchange = 'job_exchange';
    await channel.assertExchange(exchange, 'direct', {
        durable: true
    });
    const data = JSON.stringify([{ jobId, try_attempt: 0 }]);
    await channel.publish(exchange, 'job_exchange', Buffer.from(data));
    console.log(" [x] Sent %s: '%s'", data);
    await channel.close();
    await connection.close();
}

publish();