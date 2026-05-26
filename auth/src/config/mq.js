import amqplib from "amqplib";

const QUEUE = "auth_notification_queue";

let channel;

async function connectRabbitMQ() {
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
    // Do NOT process.exit(1) because nodemon will pause indefinitely. Retry instead!
    console.log("Retrying RabbitMQ connection in 5 seconds...");
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Start connection loop
connectRabbitMQ();

export async function sendAuthNotification(message) {
  try {
    if (!channel) {
      throw new Error("RabbitMQ channel not initialized");
    }

    channel.sendToQueue(
      QUEUE,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      }
    );

    console.log("📨 Auth notification queued");
  } catch (error) {
    console.error(
      "Failed to send RabbitMQ message:",
      error
    );
  }
}

export default channel;

