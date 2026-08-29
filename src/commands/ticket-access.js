const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const { getLogger } = require('../utils/logger');
const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('ticket-access')
  .setDescription('Sync ticket permissions to give Moderators and Helpers access to all existing tickets.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const modRoleId = '1532347198975639582';
  const helperRoleId = '1532347155254087720';

  const modRole = interaction.guild.roles.cache.get(modRoleId);
  const helperRole = interaction.guild.roles.cache.get(helperRoleId);

  if (!modRole && !helperRole) {
    return interaction.editReply('❌ The Moderator and Helper roles were not found on this server.');
  }

  // Find all ticket and order channels
  const ticketChannels = interaction.guild.channels.cache.filter(c => 
    c.type === 0 && (c.name.startsWith('ticket-') || c.name.startsWith('order-'))
  );

  if (ticketChannels.size === 0) {
    return interaction.editReply('ℹ️ No existing tickets found.');
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const [id, channel] of ticketChannels) {
    try {
      if (modRole) {
        await channel.permissionOverwrites.edit(modRole.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
      if (helperRole) {
        await channel.permissionOverwrites.edit(helperRole.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
      updatedCount++;
    } catch (err) {
      logger.error('TicketAccess', `Failed to update permissions for ${channel.name}`, { error: err.message });
      failedCount++;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('✅ Ticket Permissions Updated')
    .setDescription(`Moderators and helpers now have access to existing tickets.\n\n` +
      `**Updated Tickets:** \`${updatedCount}\`\n` +
      `**Failures:** \`${failedCount}\``)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { command, execute };


