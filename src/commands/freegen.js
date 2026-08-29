const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAllServices } = require('../config/services');
const { getLogger } = require('../utils/logger');
const { PANEL_BANNER_URL, COLORS } = require('../config/constants');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('freegen')
  .setDescription('Générateur interactif pour membres DreamShop')
  .setDMPermission(true);

function buildPages(services, pageSize = 20) {
  const pages = [];
  for (let i = 0; i < services.length; i += pageSize) {
    pages.push(services.slice(i, i + pageSize));
  }
  return pages;
}

function createEmbed(pageServices, page, totalPages) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.FREE)
    .setTitle('🎁 DreamShop • Free Generator')
    .setDescription('Cliquez sur le bouton ci-dessous pour générer un compte pour le service de votre choix.')
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: `Page ${page + 1}/${totalPages} • DreamShop • .gg/shop2rv`, iconURL: PANEL_BANNER_URL })
    .setTimestamp();
  return embed;
}

function createRows(pageServices) {
  const rows = [];
  for (let i = 0; i < pageServices.length; i += 5) {
    const chunk = pageServices.slice(i, i + 5);
    const row = new ActionRowBuilder();
    chunk.forEach(svc => {
      const btn = new ButtonBuilder()
        .setCustomId(`freegen_${svc.id}`)
        .setLabel(svc.label)
        .setStyle(ButtonStyle.Secondary);
      if (svc.defaultEmoji) btn.setEmoji(svc.defaultEmoji);
      row.addComponents(btn);
    });
    rows.push(row);
  }
  // Navigation row
  const navRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('freegen_prev').setLabel('⬅️ Précédent').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('freegen_next').setLabel('Suivant ➡️').setStyle(ButtonStyle.Primary)
    );
  rows.push(navRow);
  return rows;
}

async function execute(interaction) {
  try {
    const services = getAllServices();
    const pages = buildPages(services);
    const page = 0;

    const embed = createEmbed(pages[page], page, pages.length);
    const rows = createRows(pages[page]);

    await interaction.reply({ embeds: [embed], components: rows, flags: 64 });

    logger.debug('Command', 'Freegen command sent', { user: interaction.user.tag });
  } catch (error) {
    logger.error('Command', 'Error in freegen command', { error: error.message });
    await interaction.reply({ content: '❌ Une erreur est survenue lors de la préparation du générateur.', flags: 64 });
  }
}

module.exports = { command, execute };