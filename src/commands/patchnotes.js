const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { PANEL_BANNER_URL } = require('../config/constants');
const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('patchnotes')
  .setDescription('Publier une note de mise à jour (Admin seulement)')
  .addStringOption(option => 
    option.setName('version')
      .setDescription('La version de la mise à jour (ex: v3.0.0)')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('contenu')
      .setDescription('Le contenu des patchnotes (utilisez \\n pour les retours à la ligne)')
      .setRequired(true))
  .addChannelOption(option =>
    option.setName('salon')
      .setDescription('Le salon où envoyer les patchnotes')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  const version = interaction.options.getString('version');
  const contenu = interaction.options.getString('contenu').replace(/\\n/g, '\n');
  const channel = interaction.options.getChannel('salon');

  const embed = new EmbedBuilder()
    .setTitle(`🚀 DreamShop • Mise à jour ${version}`)
    .setDescription(contenu)
    .setColor('#5865F2')
    .setImage(PANEL_BANNER_URL)
    .setTimestamp()
    .setFooter({ text: 'DreamShop Updates • .gg/dreamshop', iconURL: PANEL_BANNER_URL });

  try {
    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Patchnotes envoyés avec succès dans ${channel}!`, flags: 64 });
    logger.info('Command', `Patchnotes envoyés par ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Command', `Erreur envoi patchnotes: ${error.message}`);
    await interaction.reply({ content: `❌ Erreur lors de l'envoi: ${error.message}`, flags: 64 });
  }
}

module.exports = {
  command,
  data: command,
  execute
};
