/**
 * =====================================================
 * EMOJI MANAGER - AUTO-IMPORT & DISCORD INTEGRATION
 * =====================================================
 * Automatically manages, imports, and resolves service icons
 * directly from local assets or remote storage.
 */

const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const { getLogger } = require('../utils/logger');

const logger = getLogger();
const emojiCache = new Map();

/**
 * Load and upload emojis from assets folder
 */
async function loadServiceEmojis(guild) {
  if (!guild) {
    logger.warn('EmojiManager', 'No guild provided, skipping emoji upload');
    return emojiCache;
  }

  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    return emojiCache;
  }

  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));
  if (files.length === 0) {
    return emojiCache;
  }

  logger.info('EmojiManager', `Found ${files.length} local service icons`);

  // Fetch current emojis
  const existingEmojis = await guild.emojis.fetch().catch(() => new Map());

  for (const file of files) {
    try {
      const serviceName = path.basename(file, '.png').toLowerCase();
      const emojiName = `service_${serviceName}`;

      const existingEmoji = existingEmojis.find(e => 
        e.name.toLowerCase() === emojiName || 
        e.name.toLowerCase() === `ng_${serviceName}` || 
        e.name.toLowerCase() === serviceName
      );
      
      if (existingEmoji) {
        emojiCache.set(serviceName, existingEmoji.toString());
        continue;
      }

      if (existingEmojis.size >= 50) {
        logger.warn('EmojiManager', 'Server emoji limit reached (50)');
        break;
      }

      // Upload local emoji
      const filePath = path.join(assetsDir, file);
      const emoji = await guild.emojis.create({
        attachment: filePath,
        name: emojiName,
        reason: 'DreamShop service icon auto-import'
      });

      emojiCache.set(serviceName, emoji.toString());
      logger.info('EmojiManager', `Uploaded emoji: ${emojiName}`);

      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      logger.debug('EmojiManager', `Could not upload emoji for ${file}: ${error.message}`);
    }
  }

  logger.info('EmojiManager', `✅ Emoji cache loaded: ${emojiCache.size} emojis`);
  return emojiCache;
}

/**
 * Get or fetch custom emoji from guild
 * Supports local assets, guild cache, and fallback emojis
 */
async function getOrFetchEmoji(guild, service) {
  if (!service) return '📦';
  if (!guild) return service.defaultEmoji || '📦';

  const cleanId = service.id.replace('_prime', '');

  // 1. Check in-memory cache
  if (emojiCache.has(service.id)) return emojiCache.get(service.id);
  if (emojiCache.has(cleanId)) return emojiCache.get(cleanId);

  // 2. Check guild emojis
  const existingEmoji = guild.emojis.cache.find(e => 
    e.name === service.emojiName || 
    e.name === `service_${service.id}` || 
    e.name === `service_${cleanId}` ||
    e.name === `ng_${cleanId}` ||
    e.name.toLowerCase() === cleanId.toLowerCase()
  );

  if (existingEmoji) {
    emojiCache.set(service.id, existingEmoji.toString());
    return existingEmoji;
  }

  // 3. Try to upload from local assets if bot has permissions
  if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
    try {
      const localFile = path.join(process.cwd(), 'assets', `${cleanId}.png`);
      let attachmentSource = null;

      if (fs.existsSync(localFile)) {
        attachmentSource = localFile;
      } else if (service.iconUrl) {
        attachmentSource = service.iconUrl;
      }

      if (attachmentSource && guild.emojis.cache.size < 50) {
        const newEmoji = await guild.emojis.create({
          attachment: attachmentSource,
          name: service.emojiName || `service_${cleanId}`,
          reason: 'DreamShop service icon'
        });
        
        emojiCache.set(service.id, newEmoji.toString());
        logger.info('EmojiManager', `Created custom emoji: ${newEmoji.name}`);
        return newEmoji;
      }
    } catch (error) {
      logger.debug('EmojiManager', `Could not create emoji for ${service.id}: ${error.message}`);
    }
  }

  return service.defaultEmoji || '📦';
}

/**
 * Get emoji for service
 */
function getServiceEmoji(serviceName) {
  return emojiCache.get(serviceName) || '📦';
}

/**
 * Get all emojis
 */
function getAllEmojis() {
  return Object.fromEntries(emojiCache);
}

/**
 * Clear emoji cache
 */
function clearEmojiCache() {
  emojiCache.clear();
}

module.exports = {
  loadServiceEmojis,
  getOrFetchEmoji,
  getServiceEmoji,
  getAllEmojis,
  clearEmojiCache
};
