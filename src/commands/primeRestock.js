/**
 * =====================================================
 * PRIME RESTOCK COMMAND - DREAMSHOP VIP MANAGER
 * =====================================================
 * Dedicated command for staff to restock Prime services
 * (Fortnite Prime HQ, Valorant Prime HQ, etc.)
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');
const { getServicesByTier, getServiceById } = require('../config/services');
const { getOrFetchEmoji } = require('../services/emojiManager');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('prime-restock')
  .setDescription('💎 Restocker les services Prime HQ (Fichier TXT/ULP ou Texte)')
  .setDefaultMemberPermissions('8') // Administrator
  .addAttachmentOption(option =>
    option.setName('fichier')
      .setDescription('Fichier TXT ou ULP avec les combos')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Service Prime à restocker')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(option =>
    option.setName('comptes')
      .setDescription('Ou collez directement les comptes (séparés par virgule ou espace)')
      .setRequired(false));

async function execute(interaction) {
  let tempFile = null;
  try {
    await interaction.deferReply({ flags: 64 });

    const serviceId = interaction.options.getString('service').toLowerCase();
    const attachment = interaction.options.getAttachment('fichier');
    const accountsInput = interaction.options.getString('comptes');

    const service = getServiceById(serviceId);
    if (!service) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Service Prime **${serviceId}** introuvable !`
      });
    }

    if (!attachment && !accountsInput) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Vous devez fournir un fichier (\`fichier\`) ou coller des comptes (\`comptes\`) !`
      });
    }

    let combos = [];

    // Parse direct text accounts
    if (accountsInput) {
      const inlineAccounts = accountsInput
        .split(/[\r\n,]+/)
        .map(a => a.trim())
        .filter(a => a && a.includes(':'));
      combos.push(...inlineAccounts);
    }

    // Parse attached file
    if (attachment) {
      const fileName = attachment.name.toLowerCase();
      if (!fileName.endsWith('.txt') && !fileName.endsWith('.ulp') && !fileName.endsWith('.log')) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} Format de fichier invalide ! Utilisez un fichier \`.txt\` ou \`.ulp\`.`
        });
      }

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      tempFile = path.join(tempDir, `prime_${Date.now()}_${attachment.name}`);
      await downloadFile(attachment.url, tempFile);

      await interaction.editReply({
        content: `${EMOJIS.INFO} Fichier reçu, extraction des comptes en cours...`
      });

      const fileCombos = await parseComboFile(tempFile);
      combos.push(...fileCombos);

      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }

    if (combos.length === 0) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Aucun combo valide (\`xxxx:xxxx\`) n'a été trouvé dans le fichier !`
      });
    }

    // Deduplicate in memory
    combos = [...new Set(combos)];

    let added = 0;
    const batchSize = 500;

    for (let i = 0; i < combos.length; i += batchSize) {
      const batch = combos.slice(i, i + batchSize);
      for (const combo of batch) {
        try {
          const email = combo.split(':')[0] || combo;
          const res = await query(
            'INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4) ON CONFLICT (combo) DO NOTHING',
            [serviceId, combo, email, 100]
          );
          if (res && res.rowCount > 0) {
            added++;
          }
        } catch (err) {
          try {
            await query(
              'INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4)',
              [serviceId, combo, combo, 100]
            );
            added++;
          } catch (e) {
            // Ignore duplicate key errors
          }
        }
      }
    }

    // Get total updated stock
    const stockResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
      [serviceId]
    );
    const totalStock = parseInt(stockResult.rows[0]?.count, 10) || added;

    const serviceEmoji = await getOrFetchEmoji(interaction.guild, service);

    const embed = new EmbedBuilder()
      .setTitle('💎 DreamShop • Restock Prime Effectué')
      .setDescription(
        `### ✨ Service Prime\n` +
        `> ${serviceEmoji} **${service.label}** (\`${service.id}\`)\n\n` +
        `### 📊 Résultats de l'Importation\n` +
        `> ✅ **Comptes ajoutés :** \`${added.toLocaleString()}\`\n` +
        `> 💎 **Score Qualité :** \`100/100 (Prime HQ)\`\n\n` +
        `### 📦 Stock Total Disponible\n` +
        `> 💎 \`${totalStock.toLocaleString()}\` comptes Prime disponibles`
      )
      .setColor('#FFD700')
      .setImage(PANEL_BANNER_URL)
      .setFooter({ 
        text: 'DreamShop Prime Stock Manager • .gg/dreamshop',
        iconURL: PANEL_BANNER_URL
      })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });

    logger.info('PrimeRestock', `Prime restock completed for ${serviceId}`, {
      service: serviceId,
      added,
      totalStock,
      user: interaction.user.tag
    });

  } catch (error) {
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    logger.error('PrimeRestock', 'Command error', { error: error.message });
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Erreur lors du restock Prime: ${error.message}`
    });
  }
}

async function autocomplete(interaction) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const primeServices = getServicesByTier('prime');

    const stockResult = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id').catch(() => ({ rows: [] }));
    const stockMap = {};
    for (const r of stockResult.rows || []) {
      stockMap[r.service_id] = parseInt(r.count, 10) || 0;
    }

    const choices = primeServices
      .filter(s => s.id.includes(focusedValue) || s.label.toLowerCase().includes(focusedValue))
      .map(s => ({
        name: `💎 ${s.label} (${stockMap[s.id] || 0} en stock)`,
        value: s.id
      }))
      .slice(0, 25);

    await interaction.respond(choices).catch(() => {});
  } catch (e) {
    // Suppress autocomplete timeout errors
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function parseComboFile(filePath) {
  const combos = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if line contains domain:user:pass or user:pass
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      if (parts.length === 2) {
        combos.push(`${parts[0]}:${parts[1]}`);
      } else if (parts.length >= 3) {
        if (parts[0].includes('.')) {
          combos.push(`${parts[1]}:${parts.slice(2).join(':')}`);
        } else {
          combos.push(`${parts[0]}:${parts.slice(1).join(':')}`);
        }
      }
    }
  }

  return combos;
}

module.exports = {
  command,
  execute,
  autocomplete
};
