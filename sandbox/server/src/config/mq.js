import amqp from "amqplib";

let channel = null;

export const connectRabbitMQ = async () => {
    try {
        let uri = process.env.RABBITMQ_URL || process.env.RABBITMQ_URI || "amqp://rabbitmq-service:5672";
        if (uri.includes('rabbitmq-service')) {
            uri = uri.replace('amqps://', 'amqp://');
        } else if (uri.startsWith('amqps://') && !uri.includes('heartbeat')) {
            uri += (uri.includes('?') ? '&' : '?') + 'heartbeat=30';
        }
        
        const connection = await amqp.connect(uri);
        channel = await connection.createChannel();
        await channel.assertQueue('auth_notification_queue_v2', { 
            durable: true,
            deadLetterExchange: "auth_notification_dlx",
            deadLetterRoutingKey: "failed"
        });
        console.log("Sandbox Service connected to RabbitMQ");
    } catch (error) {
        console.error("RabbitMQ connection failed:", error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
};

export const sendNotification = async (message) => {
    if (!channel) {
        console.warn("RabbitMQ channel not available");
        return;
    }
    try {
        channel.sendToQueue('auth_notification_queue_v2', Buffer.from(JSON.stringify(message)), { persistent: true });
    } catch (error) {
        console.error("Failed to send RabbitMQ message:", error.message);
    }
};
