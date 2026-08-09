const fs = require('fs');
let content = fs.readFileSync('src/index.js', 'utf-8');

const msgHandler = `
    // Message Create event for AI support
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      try {
        const { handleMessageCreate } = require('./handlers/messageHandlers');
        if (handleMessageCreate) {
          await handleMessageCreate(message);
        }
      } catch (error) {
        logger.error('Bot', 'Error in messageCreate', { error: error.message });
      }
    });
`;

content = content.replace("this.client.on('presenceUpdate',", msgHandler + "\n    this.client.on('presenceUpdate',");

fs.writeFileSync('src/index.js', content);
