/**
 * =====================================================
 * DREAMSHOP BOT - MAIN ENTRY POINT v3.0 ULTRA
 * =====================================================
 * Premier Discord Bot for Credential & Shop Management
 *
 * Features:
 * - Hybrid database (PostgreSQL + SQLite fallback)
 * - /deploy command for ultra-styled panels
 * - /config interactive control center
 * - Pure standalone Discord bot (No web server)
 * - Auto-role via custom status (.gg/dreamshop)
 * - VIP & Prime tools with instant deliveries
 *
 * Version: 3.0.0
 * Brand: DreamShop
 */

require('dotenv').config();

const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize configuration and logging
const { initializeConfig } = require('./config/config');
const { initLogger, getLogger } = require('./utils/logger');
const { initializeHybridDB } = require('./database/hybridPool');
const { runMigrations } = require('./database/migrations');

// Initialize config
const config = initializeConfig();

// Initialize logger
initLogger({
  level: config.logging.level,
  isDev: config.server.isDevelopment
});

const logger = getLogger();

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    await initializeHybridDB();
    await runMigrations();
    logger.info('Bootstrap', 'Database initialized and migrations applied');
  } catch (error) {
    logger.error('Bootstrap', 'Failed to initialize database', { error: error.message });
    throw error;
  }
}

// Import event handlers
const { handleReady } = require('./events/ready');
const { handleInteraction } = require('./events/interactionCreate');

// Import component handlers
const { registerButtonHandlers } = require('./components/buttons');
const { registerSelectHandlers } = require('./components/selects');
const { registerModalHandlers } = require('./components/modals');
const { registerInviteHandlers } = require('./events/inviteCreate');

// =====================================================
// BOT INITIALIZATION
// =====================================================

class DreamShopBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites
      ]
    });

    this.commands = new Collection();
    this.buttonHandlers = new Collection();
    this.selectHandlers = new Collection();
    this.roleSelectHandlers = new Collection();
    this.modalHandlers = new Collection();

    // Attach collections to client for easy access
    this.client.commands = this.commands;
    this.client.buttonHandlers = this.buttonHandlers;
    this.client.selectHandlers = this.selectHandlers;
    this.client.roleSelectHandlers = this.roleSelectHandlers;
    this.client.modalHandlers = this.modalHandlers;
  }

  /**
   * Load commands from directory
   */
  async loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    logger.info('Bot', `Loading ${commandFiles.length} commands...`);

    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        const module = require(filePath);

        if (!module.command || !module.execute) {
          logger.warn('Bot', `Command ${file} is missing required properties`);
          continue;
        }

        this.commands.set(module.command.name, module);
        logger.debug('Bot', `Loaded command: ${module.command.name}`);
      } catch (error) {
        logger.error('Bot', `Failed to load command ${file}`, { error: error.message });
      }
    }

    logger.info('Bot', `✅ Loaded ${this.commands.size} commands`);
  }

  /**
   * Register slash commands with Discord
   */
  async registerSlashCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID;

    if (!token || !clientId) {
      logger.warn('Bot', 'Missing DISCORD_TOKEN or CLIENT_ID for slash command registration');
      return;
    }

    try {
      logger.info('Bot', 'Registering slash commands globally...');
      const commands = this.commands.map(cmd => cmd.command.toJSON());
      const rest = new REST({ version: '10' }).setToken(token);

      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      
      logger.info('Bot', `✅ Registered ${data.length} slash commands globally`);
    } catch (error) {
      logger.error('Bot', `Failed to register slash commands: ${error.message}`);
      if (error.message.includes('401') || error.status === 401) {
        logger.error('Bot', '👉 The DISCORD_TOKEN appears to be invalid or reset. Please generate a fresh token from the Discord Developer Portal.');
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    logger.info('Bot', 'Setting up event listeners...');

    // Ready event
    this.client.once('clientReady', async () => {
      try {
        await handleReady(this.client);
        
        // Load emojis for the first guild (or main guild)
        const guild = this.client.guilds.cache.first();
        if (guild) {
          const { loadServiceEmojis } = require('./services/emojiManager');
          await loadServiceEmojis(guild);
        }
      } catch (error) {
        logger.error('Bot', 'Error in ready handler', { error: error.message });
      }
    });

    // Presence Update event for custom status and tags (.gg/dreamshop)
    this.client.on('presenceUpdate', async (oldPresence, newPresence) => {
      try {
        if (!newPresence || !newPresence.member) return;
        const member = newPresence.member;
        if (member.user.bot) return;

        const vanityString = '.gg/dreamshop'; // Required vanity string in status
        const freeRoleId = '1532347064623698010'; // Free role to give

        const customStatus = newPresence.activities?.find(activity => activity.type === 4); // 4 is Custom Status
        const hasVanity = customStatus?.state && customStatus.state.toLowerCase().includes(vanityString);
        
        const hasRole = member.roles.cache.has(freeRoleId);

        if (hasVanity && !hasRole) {
          await member.roles.add(freeRoleId).catch(() => {});
        } else if (!hasVanity && hasRole) {
          await member.roles.remove(freeRoleId).catch(() => {});
        }
      } catch (error) {
        logger.error('Bot', 'Error in presenceUpdate', { error: error.message });
      }
    });

    // Message Create event for AI support in tickets
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      try {
        const { handleMessageCreate } = require('./events/messageCreate');
        if (handleMessageCreate) {
          await handleMessageCreate(message);
        }
      } catch (error) {
        logger.error('Bot', 'Error in messageCreate', { error: error.message });
      }
    });

    // Interaction event
    this.client.on('interactionCreate', (interaction) => {
      handleInteraction(interaction).catch(error => {
        logger.error('Bot', 'Error in interaction handler', { error: error.message });
      });
    });

    // Register specialized handlers
    registerButtonHandlers(this.client);
    registerSelectHandlers(this.client);
    registerModalHandlers(this.client);
    registerInviteHandlers(this.client);

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Bot', 'Client error', { error: error.message });
    });

    this.client.on('warn', (warning) => {
      logger.warn('Bot', 'Client warning', { warning });
    });

    logger.info('Bot', '✅ Event listeners setup complete');
  }

  /**
   * Connect to Discord
   */
  async connect() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      throw new Error('DISCORD_TOKEN is not defined in environment variables');
    }

    try {
      logger.info('Bot', 'Connecting to Discord Gateway...');
      await this.client.login(token);
      global.discordClient = this.client;
      logger.info('Bot', '✅ DreamShop Bot connected successfully');
    } catch (error) {
      console.error('\n======================================================================');
      console.error('❌ ERREUR DE CONNEXION AU BOT DISCORD');
      console.error(`Message: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('An invalid token') || error.message.includes('disallowed intents')) {
        console.error('👉 Le DISCORD_TOKEN est invalide ou a été réinitialisé par Discord.');
        console.error('👉 Rendez-vous sur le Discord Developer Portal : https://discord.com/developers/applications');
        console.error('   1. Sélectionnez votre Bot');
        console.error('   2. Allez dans l\'onglet "Bot" > Cliquez sur "Reset Token"');
        console.error('   3. Vérifiez que les 3 "Privileged Gateway Intents" (Presence, Server Members, Message Content) sont TOUS COCHÉS');
        console.error('   4. Copiez le nouveau token et mettez à jour la variable DISCORD_TOKEN dans Coolify');
      }
      console.error('======================================================================\n');
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Bot', 'Shutting down gracefully...');

    try {
      // Stop all panel updates
      const { stopAllPanels } = require('./services/panelManager');
      stopAllPanels();

      // Close database connection
      const { closeHybridDB } = require('./database/hybridPool');
      await closeHybridDB();

      // Destroy Discord client
      if (this.client) {
        this.client.destroy();
      }

      logger.info('Bot', '✅ Shutdown complete');
      process.exit(1);
    } catch (error) {
      logger.error('Bot', 'Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      logger.info('Bot', '🚀 Starting DreamShop Bot v3.0.0 ULTRA');
      logger.info('Bot', '✨ Pure Standalone Discord Bot • Status: .gg/dreamshop');

      // Initialize database
      await initializeDatabase();

      // Load and register commands
      await this.loadCommands();
      await this.registerSlashCommands();

      // Setup event listeners
      this.setupEventListeners();

      // Connect to Discord
      await this.connect();

      logger.info('Bot', '✅ DreamShop Bot is LIVE and ready!');
    } catch (error) {
      logger.error('Bot', `Failed to start bot: ${error.message}`);
      // Wait 15 seconds so logs can be viewed and avoid fast crash loops
      await new Promise(r => setTimeout(r, 15000));
      await this.shutdown();
    }
  }
}

// =====================================================
// APPLICATION ENTRY POINT
// =====================================================

async function main() {
  try {
    const bot = new DreamShopBot();
    await bot.start();

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Bot', 'SIGTERM signal received');
      bot.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('Bot', 'SIGINT signal received');
      bot.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Bot', 'Uncaught exception', { error: error.message });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      logger.error('Bot', 'Unhandled rejection', { error: String(reason) });
    });
  } catch (error) {
    logger.error('Bot', 'Fatal error in main', { error: error.message });
    process.exit(1);
  }
}

// Start the application
main();

module.exports = { DreamShopBot };
