const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PANEL_BANNER_URL, COLORS } = require('../config/constants');

const command = new SlashCommandBuilder()
  .setName('server-list')
  .setDescription('Affiche la liste des serveurs où se trouve le bot et permet de le faire quitter.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guilds = Array.from(interaction.client.guilds.cache.values());
  
  if (guilds.length === 0) {
    return interaction.editReply("The bot is not in any server.");
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`🌐 DreamShop • Serveurs Actifs (${guilds.length})`)
    .setDescription('Voici la liste des serveurs où le bot est actuellement présent. Sélectionnez un serveur pour le gérer.')
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'DreamShop Server Management', iconURL: PANEL_BANNER_URL })
    .setTimestamp();

  // Show up to 25 guilds in the select menu
  const options = guilds.slice(0, 25).map(g => ({
    label: g.name.substring(0, 100),
    description: `Membres: ${g.memberCount} | ID: ${g.id}`.substring(0, 100),
    value: g.id
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('server_list_select')
    .setPlaceholder('Sélectionnez un serveur...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = {
  command,
  execute
};
