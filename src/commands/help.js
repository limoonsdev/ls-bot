/**
 * =====================================================
 * /HELP COMMAND - DREAMSHOP EDITION
 * =====================================================
 * Displays help information about bot commands.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { PANEL_BANNER_URL, COLORS } = require('../config/constants');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Afficher la liste des commandes et l\'aide DreamShop')
  .setDMPermission(true);

async function execute(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle('📋 DreamShop • Menu d\'Aide & Commandes')
      .setDescription('Bienvenue sur l\'aide officielle de **DreamShop** !\nVoici la liste des commandes disponibles :')
      .addFields(
        {
          name: '🚀 /deploy [type] [channel]',
          value: 'Déployer les panels interactifs (Générateurs, Shop, Stock, Tickets, FAQ, VIP). *(Admin)*',
          inline: false
        },
        {
          name: '📦 /addstock / /prime-restock',
          value: 'Ajouter ou restocker des comptes via fichier TXT/ULP ou lien GoFile. *(Staff)*',
          inline: false
        },
        {
          name: '🎁 /freegen',
          value: 'Générateur interactif par menu paginé.',
          inline: false
        },
        {
          name: '⚙️ /config',
          value: 'Panneau de configuration interactif du bot. *(Admin)*',
          inline: false
        },
        {
          name: '🔍 /check & /checkfiles',
          value: 'Vérifier la validité de comptes ou d\'un fichier combo.',
          inline: false
        },
        {
          name: '🎉 /giveaway & /drop',
          value: 'Créer un concours ou lâcher un compte instantané.',
          inline: false
        },
        {
          name: '💡 Astuces & Accès',
          value: '• Mettez **`.gg/dreamshop`** dans votre statut Discord pour débloquer le rôle **Free** !\n• Passez **VIP/Premium** sur le shop ou en ticket pour du stock illimité sans attente.',
          inline: false
        }
      )
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: 'DreamShop v3.0 • .gg/dreamshop', iconURL: PANEL_BANNER_URL })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: 64
    });
  } catch (error) {
    logger.error('Command', 'Error in help command', { error: error.message });
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'affichage de l\'aide.',
      flags: 64
    });
  }
}

module.exports = {
  command,
  execute
};
