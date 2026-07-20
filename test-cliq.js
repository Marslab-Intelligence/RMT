import dotenv from 'dotenv';
dotenv.config();
import { sendCliqNotification } from './server/services/cliqService.js';

async function run() {
  console.log('Sending test Cliq notification...');
  const res = await sendCliqNotification(
    `❌ *Renewal Expired*\n*Client:* Cliq Test Client\n*Service:* Test Service\nClient renewal is expired. Update the reason in RMT application.`,
    true
  );
  console.log('Result:', res);
}

run();
