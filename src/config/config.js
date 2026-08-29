/**
 * =====================================================
 * CONFIGURATION LOADER & VALIDATOR
 * =====================================================
 * Loads environment variables with validation and
 * provides configuration object for entire application.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from multiple possible locations
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const CONSTANTS = require('./constants');

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'DATABASE_URL'
];

/**
 * Validate that all required environment variables are set
 */
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📋 Please fill in the required values in .env file.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables loaded');
}

/**
 * Application configuration object
 */
const CONFIG = {
  // Bot Configuration
  get bot() {
    return {
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET,
      prefix: process.env.PREFIX || '!'
    };
  },

  // Server Configuration
  get server() {
    const port = parseInt(process.env.PORT || process.env.WEB_PORT || '3000');
    const nodeEnv = process.env.NODE_ENV || 'development';
    return {
      port,
      nodeEnv,
      externalUrl: process.env.EXTERNAL_URL || `http://localhost:${port}`,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production'
    };
  },

  // Database Configuration
  get database() {
    return {
      url: process.env.DATABASE_URL,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
      }
    };
  },

  // Logging Configuration
  get logging() {
    return {
      level: process.env.LOG_LEVEL || 'info',
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_MAX_FILES || '7d'
    };
  },

  // AI & External Services
  get ai() {
    return {
      groqApiKey: process.env.GROQ_API_KEY || null,
      geminiApiKey: process.env.GEMINI_API_KEY || null,
      cerebrasApiKey: process.env.CEREBRAS_API_KEY || null
    };
  },

  // Feature Flags
  get features() {
    return {
      enableProxyRotation: process.env.ENABLE_PROXY_ROTATION !== 'false',
      enableTranslations: process.env.ENABLE_TRANSLATIONS !== 'false',
      enableChecking: process.env.ENABLE_CHECKING !== 'false',
      enableLogging: process.env.ENABLE_LOGGING !== 'false'
    };
  },

  // Constants reference
  constants: CONSTANTS,

  // Callback URL for OAuth
  get callbackUrl() {
    return `${this.server.externalUrl}/callback`;
  }
};

/**
 * Initialize configuration
 */
function initializeConfig() {
  try {
    validateEnvironment();
    console.log(`🔧 Configuration loaded (${CONFIG.server.nodeEnv} mode)`);
    return CONFIG;
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    process.exit(1);
  }
}

module.exports = {
  CONFIG,
  initializeConfig,
  validateEnvironment
};
