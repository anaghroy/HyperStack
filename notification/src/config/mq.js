import amqplib from "amqplib";

const QUEUE = "auth_notification_queue";
let channel;
let messageHandler = null;

export function setNotificationHandler(handler) {
  messageHandler = handler;
}

export async function connectRabbitMQ() {
  try {
    let uri = process.env.RABBITMQ_URL || process.env.RABBITMQ_URI || "amqp://rabbitmq-service:5672";
    
    // Auto-correct user protocol mistakes
    if (uri.includes('rabbitmq-service')) {
      uri = uri.replace('amqps://', 'amqp://'); // Local k8s is always plain amqp
    } else if (uri.startsWith('amqps://') && !uri.includes('heartbeat')) {
      uri += (uri.includes('?') ? '&' : '?') + 'heartbeat=30'; // CloudAMQP requires heartbeat
    }

    const connection = await amqplib.connect(uri);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE, {
      durable: true,
    });

    console.log("RabbitMQ connected successfully!");

    // Automatically re-register the consumer when connection is established
    if (messageHandler) {
      channel.consume(QUEUE, async (msg) => {
        if (msg) {
          try {
            await messageHandler(msg.content.toString());
            channel.ack(msg);
          } catch (err) {
            console.error("Message processing failed:", err);
            // channel.nack(msg);
          }
        }
      });
    }

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err);
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on("close", () => {
      console.error("RabbitMQ connection closed");
      setTimeout(connectRabbitMQ, 5000);
    });

  } catch (error) {
    console.error("RabbitMQ setup failed:", error.message);
    console.log("Retrying RabbitMQ connection in 5 seconds...");
    setTimeout(connectRabbitMQ, 5000);
  }
}
