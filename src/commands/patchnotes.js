const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLogger } = require('../utils/logger');
const logger = getLogger();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('patchnotes')
    .setDescription('Publier une note de mise à jour (Admin seulement)')
    .addStringOption(option => 
      option.setName('version')
        .setDescription('La version de la mise à jour (ex: v1.2.0)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('contenu')
        .setDescription('Le contenu des patchnotes (utilisez \\n pour les retours à la ligne)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('salon')
        .setDescription('Le salon où envoyer les patchnotes')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    const version = interaction.options.getString('version');
    const contenu = interaction.options.getString('contenu').replace(/\\n/g, '\n');
    const channel = interaction.options.getChannel('salon');

    const embed = new EmbedBuilder()
      .setTitle(`🚀 Mise à jour - ${version}`)
      .setDescription(contenu)
      .setColor('#ff1744')
      .setTimestamp()
      .setFooter({ text: 'PrimeGen Updates', iconURL: interaction.guild.iconURL() });

    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Patchnotes envoyés avec succès dans ${channel}!`, ephemeral: true });
      logger.info('Command', `Patchnotes envoyés par ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Command', `Erreur envoi patchnotes: ${error.message}`);
      await interaction.reply({ content: `❌ Erreur lors de l'envoi: ${error.message}`, ephemeral: true });
    }
  }
};
