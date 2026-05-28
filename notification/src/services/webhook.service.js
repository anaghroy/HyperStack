import axios from 'axios';

export const sendWebhook = async (webhookUrl, content) => {
    if (!webhookUrl) return;
    
    try {
        const isSlack = webhookUrl.includes("slack.com");
        const payload = isSlack ? { text: content } : { content: content };
        
        await axios.post(webhookUrl, payload);
        console.log("Successfully dispatched webhook to:", webhookUrl);
    } catch (error) {
        console.error("Failed to send webhook:", error.message);
    }
};
