import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends a message to the configured Zoho Cliq channel.
 * @param {string} message - The text message to send (supports Cliq markdown).
 */
export async function sendCliqNotification(message, isSalesChannel = false, buttons = null) {
  const webhookUrl = isSalesChannel 
    ? (process.env.ZOHO_CLIQ_SALES_WEBHOOK_URL || process.env.ZOHO_CLIQ_WEBHOOK_URL)
    : process.env.ZOHO_CLIQ_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(`💬 [CLIQ SIMULATION] Message: ${message}`);
    return { success: true, simulated: true };
  }

  try {
    const payload = {
      text: message,
      bot: {
        name: "Renewal_management",
        image: "https://img.icons8.com/fluency/96/automatic.png"
      }
    };

    if (buttons) {
      payload.card = {
        title: "Action Required",
        theme: "modern-inline"
      };
      payload.buttons = buttons;
    }

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Zoho Cliq notification sent: ${message.substring(0, 50)}...`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Zoho Cliq notification failed:`, error.message);
    if (error.response) {
      console.error(`   Response status:`, error.response.status);
      console.error(`   Response data:`, JSON.stringify(error.response.data));
    }
    return { success: false, error: error.message };
  }
}
