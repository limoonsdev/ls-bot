/**
 * =====================================================
 * DEPLOY COMMAND - DREAMSHOP ULTRA EDITION
 * =====================================================
 * Deploy ultra-styled, automated panels with custom emojis
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { COLORS, EMOJIS, PANEL_BANNER_URL } = require('../config/constants');
const { getServicesByTier, getAllServices } = require('../config/services');
const { query } = require('../database/hybridPool');
const { getOrFetchEmoji } = require('../services/emojiManager');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('deploy')
  .setDescription('🚀 Déployer les panels DreamShop (Générateurs, Prime, Shop, Stock, Tickets, etc.)')
  .setDefaultMemberPermissions('8') // Administrator permission
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Type de panel à déployer')
      .setRequired(true)
      .addChoices(
        { name: '✨ Panel Générateur (Free & Premium)', value: 'basic_panel' },
        { name: '💎 Panel Prime (Fortnite & Valorant HQ)', value: 'gen_prime' },
        { name: '📦 Panel Stock Prime', value: 'prime_stock' },
        { name: '✅ Panel Vérification', value: 'verification' },
        { name: '🎫 Panel Tickets & Support', value: 'ticket' },
        { name: '📊 Panel Statut des Systèmes', value: 'status' },
        { name: '📦 Panel Stock Global en Direct', value: 'stock' },
        { name: '❓ Panel FAQ', value: 'faq' },
        { name: '🛒 Panel Boutique Automatisée', value: 'shop' },
        { name: '👑 Panel Tarifs VIP', value: 'vip_price' }
      ))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Salon où déployer le panel')
      .setRequired(true));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Ce salon n'est pas un salon textuel !`
      });
    }

    let panelsToDeploy = [];

    switch (type) {
    case 'basic_panel': {
      panelsToDeploy = await buildBasicPanels(interaction.guild);
      break;
    }
    case 'gen_prime': {
      panelsToDeploy = await buildPrimePanel(interaction.guild);
      break;
    }
    case 'prime_stock': {
      panelsToDeploy.push(await buildPrimeStockPanel(interaction.guild));
      break;
    }
    case 'verification': {
      panelsToDeploy.push(buildVerificationPanel());
      break;
    }
    case 'ticket': {
      panelsToDeploy.push(buildTicketPanel());
      break;
    }
    case 'status': {
      const { buildStatusEmbed } = require('../services/panelManager');
      panelsToDeploy.push({ embed: await buildStatusEmbed(interaction.guild), components: [] });
      break;
    }
    case 'stock': {
      panelsToDeploy.push(await buildStockPanel(interaction.guild));
      break;
    }
    case 'faq': {
      panelsToDeploy.push(buildFAQPanel());
      break;
    }
    case 'shop': {
      panelsToDeploy.push(await buildShopPanel(interaction.guild));
      break;
    }
    case 'vip_price': {
      panelsToDeploy.push(await buildVipPricePanel(interaction.guild));
      break;
    }
    }

    const messageIds = [];
    for (const panel of panelsToDeploy) {
      const msg = await channel.send({ embeds: [panel.embed || panel.embeds[0]], components: panel.components || [] });
      messageIds.push(msg.id);
    }

    // Register panels for auto-update
    if (['status', 'stock', 'basic_panel', 'gen_prime', 'prime_stock'].includes(type) && messageIds.length > 0) {
      const { registerPanel } = require('../services/panelManager');
      const { getOrCreateGuildPanels, updateGuildPanels } = require('../database/models');
      registerPanel(messageIds, channel.id, interaction.guild.id, type, interaction.client);
      
      try {
        const panels = await getOrCreateGuildPanels(interaction.guild.id);
        const panelsData = panels.panels_data || {};
        panelsData[type] = {
          channelId: channel.id,
          messageIds: messageIds,
          updatedAt: new Date().toISOString()
        };
        await updateGuildPanels(interaction.guild.id, panelsData);
      } catch (err) {
        logger.error('Deploy', 'Failed to save panel to DB', { error: err.message });
      }
    }

    logger.info('Deploy', `Panel ${type} deployed`, {
      guild: interaction.guild.id,
      channel: channel.id,
      message: messageIds[0] || 'none',
      user: interaction.user.id,
      autoUpdate: ['status', 'stock', 'basic_panel', 'gen_prime', 'prime_stock'].includes(type)
    });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **Panel ${type}** déployé avec succès dans ${channel} !\n` +
        (['status', 'stock', 'basic_panel', 'gen_prime', 'prime_stock'].includes(type) ? `${EMOJIS.INFO} Actualisation en temps réel activée.` : '')
    });

  } catch (error) {
    logger.error('Deploy', 'Deploy command failed', { error: error.message, stack: error.stack });
    const reply = {
      content: `${EMOJIS.ERROR} Erreur lors du déploiement: ${error.message}`
    };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply({ ...reply, flags: 64 });
    }
  }
}

/**
 * Build ultra-styled basic generation panel with custom emojis (1 single unified message)
 */
async function buildBasicPanels(guild) {
  const services = [...getServicesByTier('free'), ...getServicesByTier('premium')].slice(0, 25);
  
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue
  }

  const embed = new EmbedBuilder()
    .setTitle('✨ DreamShop • Générateur Principal')
    .setDescription(
      '### 🎁 Accès Free & Premium Immédiat\n\n' +
      '> 💎 **Statut Requis :** Mettez `.gg/shop2rv` dans votre profil Discord !\n' +
      '> 🔄 **Mise à jour :** Stock synchronisé en direct toutes les 5 secondes\n' +
      '> 📝 **Règle :** Avis obligatoire dans <#1532367074125545673> sous 24h\n\n' +
      `### 📦 Services Disponibles (${services.length})\n` +
      '🍿 **Streaming :** Netflix • Disney+ • Paramount+ • Prime Video • HBO Max • Crunchyroll\n' +
      '🎮 **Gaming :** Fortnite • Valorant • Minecraft • Rockstar • Steam • Roblox • Epic • Battle.net • PSN\n' +
      '🛡️ **VPN & Sécurité :** NordVPN • ExpressVPN • Mullvad VPN\n' +
      '🎵 **Musique :** Spotify • Deezer\n' +
      '🤖 **Réseaux & IA :** Discord • TikTok • ElevenLabs • Duolingo\n\n' +
      '**👇 Cliquez sur le bouton de votre choix pour recevoir vos identifiants :**'
    )
    .setColor(COLORS.FREE)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '✨ DreamShop • Accès Instantané • .gg/shop2rv',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();

  const components = [];
  let currentRow = new ActionRowBuilder();
  let buttonCount = 0;

  for (const service of services) {
    const emoji = await getOrFetchEmoji(guild, service);
    const stockCount = stockData[service.id] || 0;
    
    const button = new ButtonBuilder()
      .setCustomId(`gen_${service.tier}_${service.id}`)
      .setLabel(`${service.label.substring(0, 50)} [${stockCount}]`)
      .setStyle(service.tier === 'premium' ? ButtonStyle.Primary : ButtonStyle.Secondary);

    if (typeof emoji === 'string') {
      button.setEmoji(emoji);
    } else if (emoji && emoji.id) {
      button.setEmoji(emoji.id);
    }

    currentRow.addComponents(button);
    buttonCount++;

    if (buttonCount % 5 === 0 || buttonCount === services.length) {
      components.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
  }

  return [{ embed, components }];
}

/**
 * Build ultra-styled verification panel - Pure Discord Native Verification
 */
function buildVerificationPanel() {
  const embed = new EmbedBuilder()
    .setTitle('✅ DreamShop • Vérification des Membres')
    .setDescription(
      '### 👋 Bienvenue sur DreamShop !\n\n' +
      '> 🛡️ Pour débloquer l\'accès aux salons, générateurs et à la boutique, veuillez vous vérifier.\n\n' +
      '**Ce que vous débloquez :**\n' +
      '> 🎁 **Rôle Vérifié instantané**\n' +
      '> ⚡ **Accès débloqué en 1 clic**\n' +
      '> 👑 **Accès direct aux générateurs et tickets**\n\n' +
      '**👇 Cliquez sur le bouton ci-dessous pour valider votre accès :**'
    )
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '✅ DreamShop Verification • Instant & Secure',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('verify_user')
    .setLabel('✅ Se Vérifier / Verify')
    .setStyle(ButtonStyle.Success);

  const manualVerifyBtn = new ButtonBuilder()
    .setCustomId('verify_manual')
    .setLabel('❓ Besoin d\'aide ?')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button, manualVerifyBtn);

  return { embed, components: [row] };
}

/**
 * Build ultra-styled ticket panel
 */
function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 DreamShop • Centre de Support & Tickets')
    .setDescription(
      '**Besoin d\'assistance ou d\'une commande personnalisée ?**\n\n' +
      '> 💳 **Achats & Commandes** (Paiement, livraison Nitro, Boosts, Robux)\n' +
      '> ♻️ **Remplacements & Garanties** (Comptes, SAV)\n' +
      '> 🤝 **Partenariats & Collaborations** (YouTube, TikTok, Discord)\n' +
      '> ❓ **Questions Générales** (Comment générer, devenir VIP)\n\n' +
      '*Notre équipe vous répond rapidement 7j/7.*\n' +
      '**👇 Cliquez sur le bouton ci-dessous pour ouvrir un ticket :**'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '🎫 DreamShop Support • Service 24/7',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create')
    .setLabel('📩 Ouvrir un Ticket')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  return { embed, components: [row] };
}

/**
 * Build stock panel
 */
async function buildStockPanel(guild) {
  const { query } = require('../database/hybridPool');
  
  let totalStock = 0;
  
  const categories = {
    '🎬 STREAMING': ['netflix', 'disney', 'paramount', 'primevideo', 'hbomax', 'crunchyroll'],
    '🎮 GAMING': ['fortnite', 'valorant', 'minecraft', 'rockstar', 'steam', 'roblox', 'epicgames', 'battlenet', 'psn'],
    '🛡️ VPN & SÉCURITÉ': ['nordvpn', 'expressvpn', 'mullvadvpn'],
    '🎵 MUSIQUE': ['spotify', 'deezer'],
    '🤖 DISCORD, IA & SOCIAL': ['discord', 'tiktok', 'elevenlabs', 'duolingo']
  };

  const allServices = getAllServices();
  const stockData = {};
  
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      stockData[row.service_id] = count;
      totalStock += count;
    }
  } catch (err) {
    // Ignore DB errors
  }
  
  let description = `### 📦 Total des comptes disponibles : \`${totalStock.toLocaleString()}\`\n\n`;

  for (const [categoryName, serviceIds] of Object.entries(categories)) {
    description += `**${categoryName}**\n`;
    for (const serviceId of serviceIds) {
      const service = allServices.find(s => s.id === serviceId);
      if (!service) continue;

      const count = stockData[service.id] || 0;
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : (emoji?.toString() || service.defaultEmoji);
      
      description += `> ${emojiStr} **${service.label}:** \`${count}\`\n`;
    }
    description += '\n';
  }
  
  const embed = new EmbedBuilder()
    .setTitle('📦 DreamShop • Stock Global en Direct')
    .setDescription(description)
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '📦 DreamShop Live Stock • Auto-Update',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();
    
  return { embed, components: [] };
}

/**
 * Build ultra-styled FAQ panel
 */
function buildFAQPanel() {
  const embed = new EmbedBuilder()
    .setTitle('❓ DreamShop • Foire Aux Questions (FAQ)')
    .setDescription(
      '**Voici les réponses aux questions les plus fréquentes :**\n\n' +
      '> ⚡ **Comment générer un compte ?**\n' +
      '> Rendez-vous dans le salon du générateur et cliquez sur le bouton du service souhaité. Votre compte vous sera envoyé directement en message privé !\n\n' +
      '> ⏱️ **Y a-t-il un cooldown / temps d\'attente ?**\n' +
      '> Mettez `.gg/shop2rv` dans votre statut personnalisé Discord pour débloquer le rôle **Free**. Les membres **VIP / Premium** bénéficient de cooldowns fortement réduits ou nuls.\n\n' +
      '> 👑 **Comment obtenir le rôle VIP / Prime ?**\n' +
      '> Vous pouvez acheter le VIP directement sur la boutique automatisée ou en ouvrant un ticket pour débloquer les comptes exclusifs **💎 Prime**.\n\n' +
      '> 💬 **Pourquoi laisser un avis (#proof) ?**\n' +
      '> C\'est obligatoire dans les 24h après une génération pour maintenir la gratuité et la confiance sur le serveur. Tout manquement entraîne un avertissement.\n\n' +
      '*Une question supplémentaire ? N\'hésitez pas à ouvrir un ticket support !*'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '❓ DreamShop • Centre d\'Aide',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();
    
  return { embed, components: [] };
}

/**
 * Build Shop Panel
 */
async function buildShopPanel(guild) {
  const boostEmoji = guild ? guild.emojis.cache.find(e => e.name === 'boosts' || e.name === 'boost') : null;
  const boostEmojiConfig = boostEmoji ? { id: boostEmoji.id } : { name: '🚀' };

  const { StringSelectMenuBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('🛒 DreamShop • Boutique Automatisée')
    .setDescription(
      '**Bienvenue sur la boutique officielle DreamShop !** 🚀\n\n' +
      'Achetez vos Boosts Discord, Discord Nitro et Robux instantanément.\n' +
      'Moyens de paiement acceptés : **PayPal**, **Rewarble**, **Crypto** et **Robux**.\n\n' +
      '**Comment commander :**\n' +
      '1️⃣ Sélectionnez votre offre dans le menu déroulant ci-dessous.\n' +
      '2️⃣ Suivez les instructions fournies dans votre salon de commande.\n' +
      '3️⃣ Cliquez sur **Envoyer la preuve** pour validation automatique.\n\n' +
      '> ⚡ Livraison rapide, prix imbattables et support dédié !'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'DreamShop • Automated Shop System', iconURL: PANEL_BANNER_URL })
    .setTimestamp();

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_package_select')
      .setPlaceholder('🛒 Choisissez une offre à commander...')
      .addOptions([
        {
          label: '14 Boosts (1 Mois)',
          description: 'Prix: 3.60 EUR • Discord Server Boosts',
          value: 'pkg_14b_1m',
          emoji: boostEmojiConfig
        },
        {
          label: '28 Boosts (1 Mois)',
          description: 'Prix: 5.60 EUR • Discord Server Boosts',
          value: 'pkg_28b_1m',
          emoji: boostEmojiConfig
        },
        {
          label: '14 Boosts (3 Mois)',
          description: 'Prix: 9.00 EUR • Discord Server Boosts',
          value: 'pkg_14b_3m',
          emoji: boostEmojiConfig
        },
        {
          label: '1000 Robux',
          description: 'Prix: 1.79€ (Taxe non couverte)',
          value: 'pkg_robux_1000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1200 Robux',
          description: 'Prix: 2.15€ (Taxe non couverte)',
          value: 'pkg_robux_1200',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1400 Robux',
          description: 'Prix: 2.51€ (Taxe non couverte)',
          value: 'pkg_robux_1400',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1800 Robux',
          description: 'Prix: 3.22€ (Taxe non couverte)',
          value: 'pkg_robux_1800',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '2000 Robux',
          description: 'Prix: 3.58€ (Taxe non couverte)',
          value: 'pkg_robux_2000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '4000 Robux',
          description: 'Prix: 7.16€ (Taxe non couverte)',
          value: 'pkg_robux_4000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: 'Nitro 1 Mois (Lien Cadeau)',
          description: 'Prix: 3.60€ (Sans CB requise)',
          value: 'pkg_nitro_1m',
          emoji: { id: '1532768005388369940' }
        }
      ])
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Contacter le Support')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [selectRow, buttonRow] };
}

/**
 * Build Prime Panel - Exclusive High Quality Fortnite & Valorant
 */
async function buildPrimePanel(guild) {
  const services = getServicesByTier('prime');

  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue
  }

  const panels = [];

  for (let i = 0; i < services.length; i += 25) {
    const chunk = services.slice(i, i + 25);

    let serviceList = '> ';
    let count = 0;
    for (const service of chunk.slice(0, 12)) {
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : (emoji?.toString() || service.defaultEmoji);
      serviceList += `${emojiStr} **${service.label}**  `;
      count++;
      if (count % 3 === 0 && count < 12) serviceList += '\n> ';
    }

    const titleSuffix = i > 0 ? ` (Partie ${Math.floor(i/25) + 1})` : '';

    const embed = new EmbedBuilder()
      .setTitle(`💎 DreamShop • Générateur PRIME & VIP${titleSuffix}`)
      .setDescription(
        i === 0 ? (
          '### 👑 Accès Exclusif Haute Qualité\n\n' +
          '> ⚡ **Zéro Attente :** Génération instantanée sans file\n' +
          '> 🏆 **Comptes Garantis :** Fortnite & Valorant High Quality\n' +
          '> 📩 **Livraison Privée :** Envoi direct et sécurisé en DM\n' +
          '> 💎 **Support VIP :** Traitement prioritaire 24/7\n\n' +
          '### 📦 Services Prime Disponibles\n' +
          `${serviceList}\n\n` +
          '**👇 Cliquez sur un service Prime pour générer votre compte :**'
        ) : (
          '### 📦 Plus de services Prime...\n\n' +
          `${serviceList}\n\n` +
          '**👇 Cliquez sur un service Prime pour générer votre compte :**'
        )
      )
      .setColor('#FFD700')
      .setFooter({ 
        text: '💎 DreamShop Prime • Ultra Exclusive' + titleSuffix,
        iconURL: PANEL_BANNER_URL
      })
      .setTimestamp();

    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      const emoji = await getOrFetchEmoji(guild, service);
      const stockCount = stockData[service.id] || 0;

      const button = new ButtonBuilder()
        .setCustomId(`gen_prime_${service.id}`)
        .setLabel(`${service.label.substring(0, 50)} [${stockCount}]`)
        .setStyle(ButtonStyle.Success);

      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      if (buttonCount % 5 === 0 || buttonCount === chunk.length) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }

    panels.push({ embed, components });
  }

  return panels;
}

/**
 * Build Prime Stock Panel
 */
async function buildPrimeStockPanel(guild) {
  const { query } = require('../database/hybridPool');

  let totalStock = 0;
  const primeServices = getServicesByTier('prime');
  const stockData = {};

  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      stockData[row.service_id] = count;
      totalStock += count;
    }
  } catch (err) {
    // Ignore DB errors
  }

  let description = `### 💎 Total des comptes Prime : \`${totalStock.toLocaleString()}\`\n\n`;

  for (const service of primeServices) {
    const count = stockData[service.id] || 0;
    const emoji = await getOrFetchEmoji(guild, service);
    const emojiStr = typeof emoji === 'string' ? emoji : (emoji?.toString() || service.defaultEmoji);

    description += `> ${emojiStr} **${service.label}**: \`${count}\`\n`;
  }

  description += '\n> 💎 *Les comptes Prime sont réservés aux membres VIP avec une qualité maximale*\n' +
    '> 🔒 *Restock géré directement par le staff via `/prime-restock`*';

  const embed = new EmbedBuilder()
    .setTitle('💎 DreamShop • Stock Prime en Direct')
    .setDescription(description)
    .setColor('#FFD700')
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '💎 DreamShop Prime Stock • Auto Updates',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();

  return { embed, components: [] };
}

/**
 * Build VIP Price Panel
 */
async function buildVipPricePanel(guild) {
  const vipEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('vip') || e.name.toLowerCase().includes('premium')) || '👑' : '👑';
  const checkEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('check') || e.name.toLowerCase().includes('yes')) || '✅' : '✅';
  const moneyEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('money') || e.name.toLowerCase().includes('coin') || e.name.toLowerCase().includes('paypal')) || '💰' : '💰';
  const starEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('star')) || '✨' : '✨';
  const flashEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('flash') || e.name.toLowerCase().includes('zap')) || '⚡' : '⚡';

  const embed = new EmbedBuilder()
    .setTitle(`${vipEmoji} DreamShop VIP • L'EXPÉRIENCE ULTIME`)
    .setDescription(
      `**Passez au statut VIP et débloquez la puissance totale de DreamShop !** ${starEmoji}\n\n` +
      `### ${flashEmoji} VOS AVANTAGES EXCLUSIFS :\n` +
      `> ${checkEmoji} **Zéro Cooldown :** Générez sans attente (ou limites ultra réduites)\n` +
      `> ${checkEmoji} **Accès Prime HQ :** Accès aux générateurs exclusifs **Fortnite & Valorant High Quality**\n` +
      `> ${checkEmoji} **Plafond Élevé :** Jusqu'à 50 générations par jour !\n` +
      `> ${checkEmoji} **Support Prioritaire :** Vos tickets traités en premier\n` +
      `> ${checkEmoji} **Comptes Vérifiés :** Qualité maximale et longévité\n` +
      `> ${checkEmoji} **Salons Secrets :** Accès au salon VIP et restock leaks\n\n` +
      `### ${moneyEmoji} TARIFS VIP :\n` +
      `> **1 Semaine VIP** ➔ \`3.99€\`\n` +
      `> **1 Mois VIP** ➔ \`9.99€\` *(Offre Populaire 🔥)*\n` +
      `> **Lifetime VIP (À Vie)** ➔ \`39.99€\` *(Accès Définitif 👑)*\n\n` +
      `**Comment souscrire ?**\n` +
      `Cliquez sur le bouton ci-dessous pour ouvrir un ticket et régler par PayPal, Crypto, Robux ou Carte Cadeau.`
    )
    .setColor('#FF00FF')
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '👑 DreamShop VIP • Elevate your experience',
      iconURL: PANEL_BANNER_URL
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create')
    .setLabel('💎 Acheter le VIP / Buy VIP')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}

module.exports = { 
  command, 
  execute, 
  buildBasicPanels, 
  buildPrimePanel, 
  buildPrimeStockPanel, 
  buildStockPanel, 
  buildFAQPanel, 
  buildShopPanel, 
  buildVipPricePanel 
};
