const { EmbedBuilder } = require('discord.js');
const { getOrCreateGuildConfig } = require('../database/models');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { getLogger } = require('./logger');

const logger = getLogger();

/**
 * Resolve log channel for a guild using DB config, env vars, or channel name fallback
 */
async function resolveLogChannel(guild) {
  if (!guild) return null;

  try {
    const DEFAULT_LOG_CHANNEL_ID = '1532375665544925408';
    const guildConfig = await getOrCreateGuildConfig(guild.id).catch(() => ({}));
    const config = guildConfig.config_data || {};
    const logChannelId = config.log_channel || config.gen_log_channel || process.env.LOG_CHANNEL_ID || process.env.GEN_LOG_CHANNEL_ID || DEFAULT_LOG_CHANNEL_ID;

    if (logChannelId) {
      const channel = await guild.channels.fetch(logChannelId).catch(() => null);
      if (channel) return channel;
    }

    // Fallback: Find a channel with a standard log name
    const fallbackChannel = guild.channels.cache.find(c => 
      c.isTextBased() && ['logs', 'gen-logs', 'logs-gen', 'log', 'dreamshop-logs', 'bot-logs'].includes(c.name.toLowerCase())
    );

    return fallbackChannel || null;
  } catch (error) {
    logger.error('DiscordLogger', 'Error resolving log channel', { error: error.message });
    return null;
  }
}

/**
 * Send a general log message to Discord log channel
 */
async function sendDiscordLog(guild, action, description, color = COLORS.INFO) {
  try {
    const channel = await resolveLogChannel(guild);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`📝 DreamShop Log: ${action}`)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: 'DreamShop Logging System', iconURL: PANEL_BANNER_URL })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    logger.error('DiscordLogger', 'Failed to send Discord log', { error: error.message });
  }
}

/**
 * Send a detailed generation log displaying the generated combo
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} user
 * @param {object} service
 * @param {string} combo
 * @param {string} tier
 */
async function sendGenLog(guild, user, service, combo, tier) {
  try {
    const channel = await resolveLogChannel(guild);
    if (!channel) return;

    const colorMap = {
      prime: '#FFD700',
      premium: '#9B59B6',
      free: '#5865F2',
      vip: '#FF00FF'
    };

    const tierBadgeMap = {
      prime: '💎 PRIME HQ',
      premium: '👑 PREMIUM',
      free: '✨ FREE',
      vip: '💎 VIP'
    };

    const embed = new EmbedBuilder()
      .setTitle('🔑 DreamShop • Journal de Génération de Compte')
      .setColor(colorMap[tier] || COLORS.INFO)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '👤 Utilisateur',
          value: `${user} (\`${user.tag}\` | ID: \`${user.id}\`)`,
          inline: false
        },
        {
          name: '🛠️ Service',
          value: `**${service.label}** (\`${service.id}\`)`,
          inline: true
        },
        {
          name: '👑 Grade / Tier',
          value: `\`${tierBadgeMap[tier] || tier.toUpperCase()}\``,
          inline: true
        },
        {
          name: '🔑 Compte / Identifiants',
          value: `\`\`\`fix\n${combo}\n\`\`\``,
          inline: false
        }
      )
      .setImage(PANEL_BANNER_URL)
      .setFooter({
        text: 'DreamShop • Secure Generation Logging System',
        iconURL: PANEL_BANNER_URL
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
    logger.info('DiscordLogger', `Sent generation log for ${user.tag} (${service.id})`);
  } catch (error) {
    logger.error('DiscordLogger', 'Failed to send Gen log', { error: error.message });
  }
}

module.exports = {
  sendDiscordLog,
  sendGenLog,
  resolveLogChannel
};
