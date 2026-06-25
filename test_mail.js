require('dotenv').config({ path: './backend/.env' });
const { sendEmail } = require('./backend/utils/mailer');
setTimeout(async () => {
  try {
    const res = await sendEmail('samsrija7@gmail.com', 'Test Email', 'Testing 123');
    console.log("Result:", res);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}, 1000);
