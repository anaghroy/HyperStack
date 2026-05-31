import amqplib from "amqplib";

const QUEUE = "auth_notification_queue_v2";
const DLX = "auth_notification_dlx";
const DLQ = "auth_notification_dlq";
const RETRY_EXCHANGE = "auth_notification_retry_ex";
const RETRY_QUEUE = "auth_notification_retry_q";

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

    await channel.assertExchange(DLX, "direct", { durable: true });
    await channel.assertQueue(DLQ, { durable: true });
    await channel.bindQueue(DLQ, DLX, "failed");

    await channel.assertExchange(RETRY_EXCHANGE, "direct", { durable: true });
    await channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      deadLetterExchange: "", // default exchange
      deadLetterRoutingKey: QUEUE // route back to original queue when TTL expires
    });
    await channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, "retry");

    await channel.assertQueue(QUEUE, {
      durable: true,
      deadLetterExchange: DLX,
      deadLetterRoutingKey: "failed"
    });

    console.log("RabbitMQ connected successfully with DLQ setup!");

    // Automatically re-register the consumer when connection is established
    if (messageHandler) {
      channel.consume(QUEUE, async (msg) => {
        if (msg) {
          try {
            await messageHandler(msg.content.toString());
            channel.ack(msg);
          } catch (err) {
            console.error("Message processing failed:", err.message);
            
            const headers = msg.properties.headers || {};
            const retryCount = headers['x-retry-count'] || 0;
            const MAX_RETRIES = 3;

            if (retryCount < MAX_RETRIES) {
              const backoff = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
              console.log(`Retrying message in ${backoff}ms (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
              
              channel.publish(RETRY_EXCHANGE, "retry", msg.content, {
                expiration: backoff.toString(),
                headers: { ...headers, 'x-retry-count': retryCount + 1 }
              });
              channel.ack(msg);
            } else {
              console.error("Max retries reached. Sending to DLQ.");
              channel.nack(msg, false, false);
            }
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
