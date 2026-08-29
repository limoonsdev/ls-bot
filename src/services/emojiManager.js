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
const { SERVICES } = require('../config/services');

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

  const activeServices = SERVICES.filter(s => !s.id.endsWith('_prime'));
  const activeServiceIds = new Set(activeServices.map(s => s.id.toLowerCase()));

  // Fetch current emojis
  const existingEmojis = await guild.emojis.fetch().catch(() => new Map());
  logger.info('EmojiManager', `Guild currently has ${existingEmojis.size}/50 emojis`);

  // Cleanup deprecated service emojis if near limit to make room for new icons
  if (existingEmojis.size >= 40 && guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
    for (const emoji of existingEmojis.values()) {
      const isServiceEmoji = emoji.name.startsWith('service_') || emoji.name.startsWith('ng_');
      if (isServiceEmoji) {
        const cleanName = emoji.name.replace(/^(service_|ng_)/, '').toLowerCase();
        if (!activeServiceIds.has(cleanName)) {
          try {
            await emoji.delete('Purging deprecated service emoji');
            logger.info('EmojiManager', `Cleaned up deprecated emoji: ${emoji.name}`);
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            // Ignore error
          }
        }
      }
    }
  }

  // Refetch emojis after potential cleanup
  const currentEmojis = await guild.emojis.fetch().catch(() => new Map());

  // Prioritize active services
  for (const service of SERVICES) {
    try {
      const cleanId = service.id.replace('_prime', '').toLowerCase();
      const emojiName = `service_${cleanId}`;

      // Check if already in guild
      const existingEmoji = currentEmojis.find(e => 
        e.name.toLowerCase() === emojiName || 
        e.name.toLowerCase() === `ng_${cleanId}` || 
        e.name.toLowerCase() === cleanId ||
        e.name.toLowerCase() === service.emojiName?.toLowerCase()
      );
      
      if (existingEmoji) {
        emojiCache.set(service.id, existingEmoji);
        emojiCache.set(cleanId, existingEmoji);
        continue;
      }

      if (currentEmojis.size >= 50) {
        logger.warn('EmojiManager', 'Server emoji limit reached (50)');
        break;
      }

      // Look for local asset (case-insensitive)
      const allFiles = fs.readdirSync(assetsDir);
      const matchedFile = allFiles.find(f => f.toLowerCase() === `${cleanId}.png`);

      if (matchedFile && guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
        const filePath = path.join(assetsDir, matchedFile);
        const emoji = await guild.emojis.create({
          attachment: filePath,
          name: emojiName,
          reason: 'DreamShop service icon auto-import'
        });

        emojiCache.set(service.id, emoji);
        emojiCache.set(cleanId, emoji);
        logger.info('EmojiManager', `✅ Created emoji: ${emojiName} for ${service.label}`);

        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      logger.debug('EmojiManager', `Could not upload emoji for ${service.id}: ${error.message}`);
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

  const cleanId = service.id.replace('_prime', '').toLowerCase();

  // 1. Check in-memory cache
  if (emojiCache.has(service.id)) return emojiCache.get(service.id);
  if (emojiCache.has(cleanId)) return emojiCache.get(cleanId);

  // 2. Check guild emojis
  const existingEmoji = guild.emojis.cache.find(e => 
    e.name.toLowerCase() === service.emojiName?.toLowerCase() || 
    e.name.toLowerCase() === `service_${service.id.toLowerCase()}` || 
    e.name.toLowerCase() === `service_${cleanId}` ||
    e.name.toLowerCase() === `ng_${cleanId}` ||
    e.name.toLowerCase() === cleanId
  );

  if (existingEmoji) {
    emojiCache.set(service.id, existingEmoji);
    emojiCache.set(cleanId, existingEmoji);
    return existingEmoji;
  }

  // 3. Try to upload from local assets if bot has permissions
  if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
    try {
      const assetsDir = path.join(process.cwd(), 'assets');
      if (fs.existsSync(assetsDir)) {
        const allFiles = fs.readdirSync(assetsDir);
        const matchedFile = allFiles.find(f => f.toLowerCase() === `${cleanId}.png`);

        if (matchedFile && guild.emojis.cache.size < 50) {
          const filePath = path.join(assetsDir, matchedFile);
          const newEmoji = await guild.emojis.create({
            attachment: filePath,
            name: `service_${cleanId}`,
            reason: 'DreamShop service icon'
          });
          
          emojiCache.set(service.id, newEmoji);
          emojiCache.set(cleanId, newEmoji);
          logger.info('EmojiManager', `Created custom emoji: ${newEmoji.name}`);
          return newEmoji;
        }
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
