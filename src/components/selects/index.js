/**
 * =====================================================
 * SELECT MENU HANDLERS - DREAMSHOP EDITION
 * =====================================================
 */

const { getLogger } = require('../../utils/logger');
const { eurToLtc, LTC_ADDRESS } = require('../../services/cryptoService');
const logger = getLogger();

function registerSelectHandlers(client) {
  logger.info('SelectHandlers', 'Registering select menu handlers...');

  // Server List Select Handler
  client.selectHandlers.set('server_list_select', async (interaction) => {
    try {
      const guildId = interaction.values[0];
      const guild = interaction.client.guilds.cache.get(guildId);
      
      if (!guild) {
        return interaction.reply({ content: '❌ Ce serveur est introuvable (le bot l\'a peut-être déjà quitté).', flags: 64 });
      }

      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🛠️ Gestion: ${guild.name}`)
        .setDescription(`**ID:** ${guild.id}\n**Membres:** ${guild.memberCount}\n**Propriétaire ID:** ${guild.ownerId}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp();

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`server_leave_${guild.id}`)
          .setLabel('Faire quitter le bot de ce serveur')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚪')
      );

      await interaction.reply({ embeds: [embed], components: [btnRow], flags: 64 });
    } catch (err) {
      logger.error('SelectHandlers', 'Server list select failed', { error: err.message });
    }
  });

  client.selectHandlers.set('config_select_category', async (interaction) => {
    try {
      const { handleCategorySelection } = require('../../commands/config');
      await handleCategorySelection(interaction);
    } catch (error) {
      logger.error('SelectHandlers', 'Config category selection failed', { error: error.message });
    }
  });

  client.selectHandlers.set('config_cooldown_role_select', async (interaction) => {
    try {
      if (interaction.values && interaction.values.length > 0) {
        const { showCustomRoleCooldownModal } = require('../../commands/config');
        await showCustomRoleCooldownModal(interaction, interaction.values[0]);
      }
    } catch (error) {
      logger.error('SelectHandlers', 'Config role selection failed', { error: error.message });
    }
  });

  // Shop Package Select Handler
  client.selectHandlers.set('shop_package_select', async (interaction) => {
    await interaction.deferReply({ flags: 64 });

    try {
      const selectedValue = interaction.values[0];
      let quantity = 1;
      let duration = 1;
      let totalPrice = 0;
      let robuxPrice = 0;
      let product = 'Unknown Product';
      let robuxUrl = process.env.SHOP_ROBUX_URL || 'https://roblox.com';

      switch (selectedValue) {
      case 'pkg_14b_1m':
        quantity = 14; duration = 1; totalPrice = 3.60; robuxPrice = 400;
        product = '14 Discord Server Boosts (1 Mois)';
        break;
      case 'pkg_28b_1m':
        quantity = 28; duration = 1; totalPrice = 5.60; robuxPrice = 700;
        product = '28 Discord Server Boosts (1 Mois)';
        break;
      case 'pkg_14b_3m':
        quantity = 14; duration = 3; totalPrice = 9.00; robuxPrice = 1100;
        product = '14 Discord Server Boosts (3 Mois)';
        break;
      case 'pkg_robux_1000':
        quantity = 1000; duration = 0; totalPrice = 1.79; robuxPrice = 1429;
        product = '1000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1200':
        quantity = 1200; duration = 0; totalPrice = 2.15; robuxPrice = 1714;
        product = '1200 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1400':
        quantity = 1400; duration = 0; totalPrice = 2.51; robuxPrice = 2000;
        product = '1400 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1800':
        quantity = 1800; duration = 0; totalPrice = 3.22; robuxPrice = 2571;
        product = '1800 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_2000':
        quantity = 2000; duration = 0; totalPrice = 3.58; robuxPrice = 2858;
        product = '2000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_4000':
        quantity = 4000; duration = 0; totalPrice = 7.16; robuxPrice = 5715;
        product = '4000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_nitro_1m':
        quantity = 1; duration = 1; totalPrice = 3.60; robuxPrice = 0;
        product = 'Discord Nitro 1 Mois (Lien Cadeau)';
        robuxUrl = 'N/A';
        break;
      default:
        return interaction.editReply({ content: '❌ Offre sélectionnée inconnue.' });
      }
      
      const { query } = require('../../database/hybridPool');
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
      const { COLORS, PANEL_BANNER_URL } = require('../../config/constants');
      
      const orderId = 'DREAM-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      const paypalLink = process.env.SHOP_PAYPAL_EMAIL || process.env.SHOP_PAYPAL_ME || 'paypal@dreamshop.gg';
      const ltcAmount = await eurToLtc(totalPrice);
      
      // Create a ticket for the order
      let ticketCategory = interaction.guild.channels.cache.find(c => c.type === 4 && (c.name.toLowerCase().includes('order') || c.name.toLowerCase().includes('commande')));
      if (!ticketCategory) {
        ticketCategory = await interaction.guild.channels.create({
          name: '🛒 COMMANDES',
          type: 4
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `order-${interaction.user.username}`,
        type: 0,
        parent: ticketCategory.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: ['ViewChannel']
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          },
          {
            id: '1532347198975639582', // Mod role
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          },
          {
            id: '1532347155254087720', // Helper role
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
          }
        ]
      });
      
      // Insert pending order into database
      await query(
        'INSERT INTO orders (user_id, product, quantity, duration, price, currency, paypal_order_id, payment_proof, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [interaction.user.id, product, quantity, duration, totalPrice, 'EUR', orderId, String(ltcAmount), 'PENDING_PAYMENT']
      );
      
      const embed = new EmbedBuilder()
        .setTitle('💳 DreamShop • Finalisation de votre Commande')
        .setDescription(
          `Merci d'avoir choisi **DreamShop** ! Vous commandez :\n` +
          `> 📦 **Article :** \`${product}\`\n` +
          `> 💶 **Prix (EUR) :** \`${totalPrice.toFixed(2)}€\`\n` +
          `> 🪙 **Prix (LTC) :** \`${ltcAmount} LTC\`\n\n` +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '### 💳 1. PAIEMENT PAYPAL (Entre Proches / Friends & Family)\n' +
          `> 📧 **Envoyez \`${totalPrice.toFixed(2)}€\` à :** \`${paypalLink}\`\n` +
          `> 📝 **NOTE OBLIGATOIRE À METTRE :** \`${orderId}\`\n` +
          '> ⚠️ *Attention : Indiquez impérativement la note exacte pour vérification automatique.*\n\n' +
          '### 🪙 2. PAIEMENT LITECOIN (LTC) - VÉRIFICATION BLOCKCHAIN\n' +
          `> 📍 **Adresse LTC :** \`${LTC_ADDRESS}\`\n` +
          `> 💎 **Montant exact :** \`${ltcAmount} LTC\`\n` +
          '> ⚡ *Dès le paiement envoyé, cliquez sur "Vérifier le paiement LTC" ci-dessous.*\n\n' +
          '### 🟡 3. AUTRES MOYENS (REWARBLE / ROBUX / CRYPTO)\n' +
          '> Préparez votre code cadeau Rewarble ou demandez le lien Gamepass au staff dans ce salon.\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '**👇 Cliquez sur le bouton correspondant après votre paiement :**'
        )
        .setImage(PANEL_BANNER_URL || null)
        .setColor(COLORS.INFO)
        .setFooter({ text: `Commande: ${orderId} • DreamShop Automated Shop` })
        .setTimestamp();
        
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_paypal_paid_${orderId}`)
          .setLabel('🔵 J\'ai payé par PayPal')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`shop_ltc_check_${orderId}`)
          .setLabel('🪙 Vérifier le paiement LTC')
          .setStyle(ButtonStyle.Success)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_submit_payment_${orderId}`)
          .setLabel('📤 Preuve Manuelle / Autre')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('❌ Annuler / Fermer')
          .setStyle(ButtonStyle.Danger)
      );
      
      await ticketChannel.send({ 
        content: `<@${interaction.user.id}> | Bienvenue dans votre salon de commande !`, 
        embeds: [embed], 
        components: [row1, row2] 
      });
      
      return await interaction.editReply({ content: `✅ Votre salon de commande a été créé : <#${ticketChannel.id}>` });
      
    } catch (error) {
      logger.error('SelectHandlers', 'Shop package selection failed', { error: error.message });
      return await interaction.editReply({ content: `❌ Une erreur est survenue : ${error.message}` });
    }
  });

  logger.info('SelectHandlers', '✅ Select menu handlers registered');
}

module.exports = {
  registerSelectHandlers
};
