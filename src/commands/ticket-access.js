const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');
const { getLogger } = require('../utils/logger');
const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('ticket-access')
  .setDescription('Sync ticket permissions to give Moderators and Helpers access to all existing tickets.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const modRoleId = '1532347198975639582';
  const helperRoleId = '1532347155254087720';

  const modRole = interaction.guild.roles.cache.get(modRoleId);
  const helperRole = interaction.guild.roles.cache.get(helperRoleId);

  if (!modRole && !helperRole) {
    return interaction.editReply('❌ Les rôles Modérateur et Helper sont introuvables sur ce serveur.');
  }

  // Find all ticket and order channels
  const ticketChannels = interaction.guild.channels.cache.filter(c => 
    c.type === 0 && (c.name.startsWith('ticket-') || c.name.startsWith('order-'))
  );

  if (ticketChannels.size === 0) {
    return interaction.editReply('ℹ️ Aucun ticket existant trouvé.');
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
    .setTitle('✅ Permissions des Tickets Mises à Jour')
    .setDescription(`Les modérateurs et helpers ont maintenant accès aux tickets existants.\n\n` +
      `**Tickets mis à jour :** \`${updatedCount}\`\n` +
      `**Échecs :** \`${failedCount}\``)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { command, execute };
