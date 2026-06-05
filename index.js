require('dotenv').config();

const app = require('./src/app');
const connectDatabase = require('./src/config/database');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await connectDatabase(process.env.MONGODB_URI);

    app.listen(port, () => {
      console.log(`MeetN-Sniff API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start MeetN-Sniff API:', error.message);
    process.exit(1);
  }
}

startServer();
