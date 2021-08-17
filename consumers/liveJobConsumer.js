const amqp = require("amqplib");

async function connect() {
    try {
        const amqpServer = "amqp://localhost:5672"
        const connection = await amqp.connect(amqpServer)
        const channel = await connection.createChannel();
        await channel.assertQueue("jobs");

        channel.consume("jobs", message => {
            const input = JSON.parse(message.content.toString());
            console.log(`Recieved job with input ${input.number}`);

            channel.ack(message);
        })

        console.log("Waiting for messages...");
    }
    catch (ex) {
        console.error(ex)
    }

}

module.exports = {
    connect,
}
