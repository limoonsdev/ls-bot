/**
 * =====================================================
 * DEPLOY COMMAND - ULTRA PREMIUM EDITION
 * =====================================================
 * Deploy ultra-styled panels with custom emojis
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
  .setDescription('🚀 Deploy PrimeGen.eu panels')
  .setDefaultMemberPermissions('8') // Administrator permission
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Type of panel to deploy')
      .setRequired(true)
      .addChoices(
        { name: '✨ Free Generators Panel', value: 'basic_panel' },
        { name: '🌟 Premium Generators Panel', value: 'gen_premium' },
        { name: '💎 Prime Generators Panel', value: 'gen_prime' },
        { name: '🤝 Targxt Collab Panel', value: 'collab_targxt' },
        { name: '✉️ PrimeMail (Temp OTP)', value: 'primemail' },
        { name: '✅ Verification Panel (Web Callback)', value: 'verification' },
        { name: '🎫 Ticket & Support Panel', value: 'ticket' },
        { name: '📊 Systems Status Panel', value: 'status' },
        { name: '📦 Live Stock Panel', value: 'stock' }
      ))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel to deploy the panel in')
      .setRequired(true));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This channel is not a text channel!`
      });
    }

    let panelsToDeploy = [];

    switch (type) {
    case 'basic_panel': {
      panelsToDeploy = await buildBasicPanels(interaction.guild);
      break;
    }
    case 'gen_premium': {
      panelsToDeploy = await buildPremiumPanel(interaction.guild);
      break;
    }
    case 'collab_targxt': {
      panelsToDeploy = await buildTargxtPanel(interaction.guild);
      break;
    }
    case 'gen_prime': {
      panelsToDeploy = await buildPrimePanel(interaction.guild);
      break;
    }
    case 'primemail': {
      panelsToDeploy.push(buildPrimeMailPanel());
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
    }

    const messageIds = [];
    for (const panel of panelsToDeploy) {
      const msg = await channel.send({ embeds: [panel.embed || panel.embeds[0]], components: panel.components || [] });
      messageIds.push(msg.id);
    }

    // Register panels for auto-update
    if (['status', 'stock', 'basic_panel', 'gen_premium', 'gen_prime', 'collab_targxt'].includes(type) && messageIds.length > 0) {
      const { registerPanel } = require('../services/panelManager');
      const { getOrCreateGuildPanels, updateGuildPanels } = require('../database/models');
      // Pass the array of message IDs, identifying the group by the first ID
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
      autoUpdate: ['status', 'stock', 'basic_panel', 'gen_premium', 'gen_prime', 'collab_targxt'].includes(type)
    });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **${type}** panel successfully deployed in ${channel}!\n` +
        (['status', 'stock', 'basic_panel', 'gen_premium', 'gen_prime', 'collab_targxt'].includes(type) ? `${EMOJIS.INFO} Auto-update activated (every 5 seconds)` : '')
    });

  } catch (error) {
    logger.error('Deploy', 'Deploy command failed', { error: error.message, stack: error.stack, errors: error.errors });
    const reply = {
      content: `${EMOJIS.ERROR} Error during deployment: ${error.message}`
    };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply({ ...reply, flags: 64 });
    }
  }
}

/**
 * Build ultra-styled basic generation panel with custom emojis - NO ASCII (Supports multiple messages)
 */
async function buildBasicPanels(guild) {
  // Get all free services
  const services = getServicesByTier('free');
  
  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep services that have stock > 0
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0);

  const panels = [];
  
  if (availableServices.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('✨ PRIMEGEN BASIC')
      .setDescription('**No service is currently available!**\n\nCome back later after the next restock.')
      .setColor(COLORS.FREE)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: '✨ PrimeGen • Basic Access', iconURL: 'https://i.goopics.net/2eukvn.gif' })
      .setTimestamp();
    return [{ embed, components: [] }];
  }
  
  // Split services into chunks of 25 (Discord max components per message)
  for (let i = 0; i < availableServices.length; i += 25) {
    const chunk = availableServices.slice(i, i + 25);
    
    const embed = new EmbedBuilder()
      .setTitle(`⚡ PRIMEGEN.EU | FREE GENERATORS${titleSuffix}`)
      .setDescription(
        'Welcome to **PrimeGen Free**.\n\n' +
        '• **Stock:** Synced in real-time with `primegen.eu`\n' +
        '• **Support:** `.gg/primegen`\n\n' +
        'Select a service below to generate an account.'
      )
      .setColor(COLORS.FREE)
      .setFooter({ 
        text: '⚡ PrimeGen.eu • Connected' + titleSuffix,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();
      
    // Only add banner to the first message to prevent chat clutter
    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    // Create buttons with CUSTOM emojis
    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      // Get or create custom emoji
      const emoji = await getOrFetchEmoji(guild, service);
      
      const stockCount = stockData[service.id] || 0;
      
      const button = new ButtonBuilder()
        .setCustomId(`gen_${service.tier}_${service.id}`)
        .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
        .setStyle(ButtonStyle.Primary);

      // Set emoji (custom object or default string)
      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      // Start new row after 5 buttons
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
 * Build ultra-styled verification panel - OAUTH2 LINK
 */
function buildVerificationPanel() {
  const OAUTH2_URL = 'https://primegen.eu/api/auth/signin/discord';

  const embed = new EmbedBuilder()
    .setTitle('⚡ PRIMEGEN.EU | VERIFICATION')
    .setDescription(
      'Welcome to **PrimeGen**.\n\n' +
      'Please verify your Discord account to gain full access to the server and our services.\n\n' +
      '• Click the **Verify Me** button to link your account.\n' +
      '• Powered by `primegen.eu`'
    )
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu Verification • Secure & Instant',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setLabel('✅ Verify Me')
    .setStyle(ButtonStyle.Link)
    .setURL(OAUTH2_URL);

  const manualVerifyBtn = new ButtonBuilder()
    .setCustomId('verify_manual')
    .setLabel('❓ Doesn\'t work? Click here!')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button, manualVerifyBtn);

  return { embed, components: [row] };
}

/**
 * Build ultra-styled ticket panel - NO ASCII
 */
function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('⚡ PRIMEGEN.EU | SUPPORT')
    .setDescription(
      'Welcome to **PrimeGen Support**.\n\n' +
      'If you have any issues with purchases, generators, or have a general inquiry, click the button below to open a ticket.\n\n' +
      'Our team will assist you shortly.'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu Support • Available 24/7',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create')
    .setLabel('📩 Open a Ticket')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  return { embed, components: [row] };
}

async function buildStockPanel(guild) {
  const { query } = require('../database/hybridPool');
  
  let totalStock = 0;
  
  const categories = {
    '🎬 STREAMING': ['netflix', 'disney', 'paramount', 'hbomax', 'primevideo', 'crunchyroll', 'adn', 'dazn'],
    '🎮 GAMING': ['steam', 'epicgames', 'fortnite', 'valorant', 'xbox', 'psn', 'battlenet', 'roblox'],
    '🛡️ VPN': ['nordvpn', 'expressvpn', 'mullvadvpn', 'protonvpn'],
    '🎵 MUSIC': ['spotify', 'deezer'],
    '📧 OTHERS': ['gmail', 'hotmail', 'paypal', 'ebay', 'duolingo', 'mega']
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
  
  let description = `**Total Accounts Available:** \`${totalStock}\`\n\n`;

  for (const [categoryName, serviceIds] of Object.entries(categories)) {
    description += `**${categoryName}**\n`;
    for (const serviceId of serviceIds) {
      const service = allServices.find(s => s.id === serviceId);
      if (!service) continue;

      const count = stockData[service.id] || 0;
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : `<:${emoji.name}:${emoji.id}>`;
      
      description += `> ${emojiStr} **${service.label}:** \`${count}\`\n`;
    }
    description += '\n';
  }
  
  const embed = new EmbedBuilder()
    .setTitle('⚡ PRIMEGEN.EU | LIVE STOCK')
    .setDescription(description)
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu Stock • Real-Time Updates',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();
    
  return { embed, components: [] };
}

/**
 * Build ultra-styled FAQ panel
 */
function buildFAQPanel() {
  const embed = new EmbedBuilder()
    .setTitle('⚡ PRIMEGEN.EU | F.A.Q')
    .setDescription(
      '**Welcome to the FAQ! Here are answers to the most common questions:**\n\n' +
      '> ⚡ **How do I generate an account?**\n' +
      '> Go to the generator channels or directly on **[primegen.eu](https://primegen.eu)**.\n\n' +
      '> ⏱️ **Is there a cooldown?**\n' +
      '> Yes! Free users have a cooldown between generations. Premium users have zero cooldown. (Check `/help` for your status!)\n\n' +
      '> 👑 **How do I get Premium?**\n' +
      '> You can buy Premium to unlock exclusive services, bypass cooldowns, and get instant priority delivery. Check the **Shop**!\n\n' +
      '> ❌ **My generated account doesn\'t work!**\n' +
      '> Free accounts can sometimes die fast. For guaranteed high-quality accounts, use the **Premium** generator. If you purchased something and it doesn\'t work, open a **Ticket**.\n\n' +
      '> 💬 **Why should I leave a #proof?**\n' +
      '> Leaving proofs helps us maintain trust and sometimes earns you rewards! Plus, it\'s nice to say thanks.\n\n' +
      '*Still have questions? Feel free to open a ticket!*'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu • Knowledge Base',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
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
    .setTitle('⚡ PRIMEGEN.EU | SHOP')
    .setDescription(
      '**Welcome to our Automated Shop!** 🚀\n\n' +
      'Here you can purchase Discord Server Boosts, Discord Nitro, and Robux instantly.\n' +
      'Our system supports **PayPal**, **Rewarble**, and **Robux**.\n\n' +
      '**How it works:**\n' +
      '1️⃣ Select your desired package from the menu below.\n' +
      '2️⃣ Follow the payment instructions (PayPal, Giftcard, or Gamepass).\n' +
      '3️⃣ Click **Submit Payment Proof** to verify your order.\n\n' +
      '> ⚡ Secure, Fast, and Reliable!'
    )
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: '⚡ PrimeGen.eu • Auto Shop System', iconURL: 'https://i.goopics.net/2eukvn.gif' })
    .setTimestamp();

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_package_select')
      .setPlaceholder('🛒 Select an item to order...')
      .addOptions([
        {
          label: '14 Boosts (1 Month)',
          description: 'Price: 3.60 EUR',
          value: 'pkg_14b_1m',
          emoji: boostEmojiConfig
        },
        {
          label: '28 Boosts (1 Month)',
          description: 'Price: 5.60 EUR',
          value: 'pkg_28b_1m',
          emoji: boostEmojiConfig
        },
        {
          label: '14 Boosts (3 Months)',
          description: 'Price: 9.00 EUR',
          value: 'pkg_14b_3m',
          emoji: boostEmojiConfig
        },
        {
          label: '1000 Robux',
          description: '1.79€ (Tax Not Covered)',
          value: 'pkg_robux_1000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1200 Robux',
          description: '2.15€ (Tax Not Covered)',
          value: 'pkg_robux_1200',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1400 Robux',
          description: '2.51€ (Tax Not Covered)',
          value: 'pkg_robux_1400',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '1800 Robux',
          description: '3.22€ (Tax Not Covered)',
          value: 'pkg_robux_1800',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '2000 Robux',
          description: '3.58€ (Tax Not Covered)',
          value: 'pkg_robux_2000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: '4000 Robux',
          description: '7.16€ (Tax Not Covered)',
          value: 'pkg_robux_4000',
          emoji: { id: '1533223890548035746' }
        },
        {
          label: 'Nitro 1 Month (Gift Link)',
          description: '3.60€ (No CC Required)',
          value: 'pkg_nitro_1m',
          emoji: { id: '1532768005388369940' }
        }
      ])
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Contact Support')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [selectRow, buttonRow] };
}

/**
 * Build Prime Panel - Only Fortnite High Quality & Valorant Medium Quality
 */
async function buildPrimePanel(guild) {
  const services = getServicesByTier('prime');

  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep services that have stock > 0
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0);

  const panels = [];

  if (availableServices.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('⚡ PRIMEGEN.EU | PRIME GENERATOR')
      .setDescription('**No Prime service is currently available!**\n\nCome back later after the next restock.')
      .setColor(COLORS.PREMIUM)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: '⚡ PrimeGen.eu Prime • Ultra Exclusive', iconURL: 'https://i.goopics.net/2eukvn.gif' })
      .setTimestamp();
    return [{ embed, components: [] }];
  }
  // Split services into chunks of 25 (Discord max components per message)
  for (let i = 0; i < availableServices.length; i += 25) {
    const chunk = availableServices.slice(i, i + 25);
    const titleSuffix = i > 0 ? ` (Part ${Math.floor(i/25) + 1})` : '';

    const embed = new EmbedBuilder()
      .setTitle(`⚡ PRIMEGEN.EU | PRIME EXCLUSIVE${titleSuffix}`)
      .setDescription(
        'Welcome to **PrimeGen Prime**.\n\n' +
        '• **High Quality:** Guaranteed working HQ/MQ accounts\n' +
        '• **No Queue:** Instant delivery via DMs\n' +
        '• **Support:** Priority assistance via `.gg/primegen`\n\n' +
        'Select a Prime service below to generate.'
      )
      .setColor('#FFD700') // Gold color for Prime
      .setFooter({ 
        text: '💎 PrimeGen Prime • Ultra Exclusive' + titleSuffix,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();

    // Only add banner to the first message to prevent chat clutter
    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    // Create buttons with CUSTOM emojis
    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      // Get or create custom emoji
      const emoji = await getOrFetchEmoji(guild, service);

      const stockCount = stockData[service.id] || 0;

      const button = new ButtonBuilder()
        .setCustomId(`gen_prime_${service.id}`)
        .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
        .setStyle(ButtonStyle.Success);

      // Set emoji (custom object or default string)
      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      // Start new row after 5 buttons
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
 * Build Prime Stock Panel - Shows stock for Prime services (Restock via /prime-restock)
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

  let description = `**💎 Prime Total Accounts Available:** \`${totalStock}\`\n\n`;

  for (const service of primeServices) {
    const count = stockData[service.id] || 0;
    const emoji = await getOrFetchEmoji(guild, service);
    const emojiStr = typeof emoji === 'string' ? emoji : `<:${emoji.name}:${emoji.id}>`;

    description += `> ${emojiStr} **${service.label}**: \`${count}\`\n`;
  }

  description += '\n> 💎 *Prime accounts are premium quality with better stats and longevity*\n' +
    '> 🔒 *Restock is strictly restricted to staff using `/prime-restock`*';

  const embed = new EmbedBuilder()
    .setTitle('⚡ PRIMEGEN.EU | PRIME STOCK')
    .setDescription(description)
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu Prime Stock • Auto Updates Every 5s',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  return { embed, components: [] };
}

/**
 * Build VIP Price Panel
 */
async function buildVipPricePanel(guild) {
  // Try to find custom emojis for decoration
  const vipEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('vip') || e.name.toLowerCase().includes('premium')) || '👑' : '👑';
  const checkEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('check') || e.name.toLowerCase().includes('yes')) || '✅' : '✅';
  const moneyEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('money') || e.name.toLowerCase().includes('coin') || e.name.toLowerCase().includes('paypal')) || '💰' : '💰';
  const starEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('star')) || '✨' : '✨';
  const flashEmoji = guild ? guild.emojis.cache.find(e => e.name.toLowerCase().includes('flash') || e.name.toLowerCase().includes('zap')) || '⚡' : '⚡';

  const embed = new EmbedBuilder()
    .setTitle(`⚡ PRIMEGEN.EU | PRIME SUBSCRIPTION`)
    .setDescription(
      `**Upgrade to PRIME and unlock the full potential of PrimeGen!** ${starEmoji}\n\n` +
      `### ${flashEmoji} EXCLUSIVE ADVANTAGES:\n` +
      `> ${checkEmoji} **Zero Cooldown:** Generate without waiting (or highly reduced limits).\n` +
      `> ${checkEmoji} **Prime Access:** Access to the ultra-exclusive **💎 Prime** generators.\n` +
      `> ${checkEmoji} **Web & Discord Sync:** Your subscription works everywhere.\n` +
      `> ${checkEmoji} **Priority Support:** Your tickets are answered first.\n` +
      `> ${checkEmoji} **High Quality:** Guaranteed working and high-level accounts.\n\n` +
      `### ${moneyEmoji} PRIME PRICING:\n` +
      `> **Premium** ➔ \`4.99€\` / month\n` +
      `> **Prime** ➔ \`9.99€\` / month (Best Value 🔥)\n\n` +
      `**How to purchase?**\n` +
      `Click the button below to open a ticket or visit **[primegen.eu/dashboard/shop](https://primegen.eu/dashboard/shop)**.`
    )
    .setColor(COLORS.PREMIUM) // VIP Pink/Purple color
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu PRIME • Elevate your experience',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create')
    .setLabel('💎 Purchase V.I.P')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}

/**
 * Build PrimeTools Panel
 */


/**
 * Build ultra-styled Premium generation panel
 */
async function buildPremiumPanel(guild) {
  // Get all premium services
  const services = getServicesByTier('premium');
  
  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep services that have stock > 0
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0);

  const panels = [];
  
  if (availableServices.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('⚡ PRIMEGEN.EU | PREMIUM GENERATORS')
      .setDescription('**No premium service is currently available!**\n\nCome back later after the next restock.')
      .setColor(COLORS.PREMIUM)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: '⚡ PrimeGen.eu • Premium Access', iconURL: 'https://i.goopics.net/2eukvn.gif' })
      .setTimestamp();
    return [{ embed, components: [] }];
  }
  
  // Split services into chunks of 25 (Discord max components per message)
  for (let i = 0; i < availableServices.length; i += 25) {
    const chunk = availableServices.slice(i, i + 25);
    
    const embed = new EmbedBuilder()
      .setTitle(`⚡ PRIMEGEN.EU | PREMIUM GENERATORS${titleSuffix}`)
      .setDescription(
        'Welcome to **PrimeGen Premium**.\n\n' +
        '• **Stock:** Synced in real-time with `primegen.eu`\n' +
        '• **Support:** `.gg/primegen`\n\n' +
        'Select a Premium service below to generate an account.'
      )
      .setColor(COLORS.PREMIUM)
      .setFooter({ 
        text: '⚡ PrimeGen.eu • Connected' + titleSuffix,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();
      
    // Only add banner to the first message to prevent chat clutter
    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    // Create buttons with CUSTOM emojis
    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      // Get or create custom emoji
      const emoji = await getOrFetchEmoji(guild, service);
      
      const stockCount = stockData[service.id] || 0;
      
      const button = new ButtonBuilder()
        .setCustomId(`gen_${service.tier}_${service.id}`)
        .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
        .setStyle(ButtonStyle.Success);

      // Set emoji (custom object or default string)
      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      // Start new row after 5 buttons
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
 * Build ultra-styled Targxt Collab Panel
 */
async function buildTargxtPanel(guild) {
  // We can reuse some premium services or all free services for Targxt
  const services = getServicesByTier('free'); // Can adjust what services are given
  
  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep top 5 services for the collab to keep it neat
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0).slice(0, 5);

  const panels = [];
  
  const embed = new EmbedBuilder()
    .setTitle(`🤝 PRIMEGEN x TARGXT`)
    .setDescription(
      'Welcome to the **Targxt Collab** generator.\n\n' +
      '• **Requirement:** `.gg/targxt` in your Custom Status\n' +
      '• **Stock:** Shared with PrimeGen\n' +
      '• **Support:** `.gg/targxt`\n\n' +
      'Select a service below to generate.'
    )
    .setColor('#FF4500') // Targxt color? Orange/Red
    .setFooter({ 
      text: '🤝 PrimeGen x Targxt • Partnership',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setImage(PANEL_BANNER_URL)
    .setTimestamp();
      
  const components = [];
  let currentRow = new ActionRowBuilder();

  for (const service of availableServices) {
    const emoji = await getOrFetchEmoji(guild, service);
    const stockCount = stockData[service.id] || 0;
    
    // Custom ID for Targxt collab check
    const button = new ButtonBuilder()
      .setCustomId(`gen_targxt_${service.id}`)
      .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
      .setStyle(ButtonStyle.Danger);

    if (typeof emoji === 'string') {
      button.setEmoji(emoji);
    } else if (emoji && emoji.id) {
      button.setEmoji(emoji.id);
    }

    currentRow.addComponents(button);
  }
  
  if (availableServices.length > 0) {
    components.push(currentRow);
  }

  panels.push({ embed, components });
  return panels;
}

/**
 * Build PrimeMail (Temp OTP) Panel
 */
function buildPrimeMailPanel() {
  const embed = new EmbedBuilder()
    .setTitle('✉️ PRIMEGEN.EU | PRIMEMAIL')
    .setDescription(
      'Welcome to **PrimeMail** Temp Mail service.\n\n' +
      '• **Generate:** Get a disposable email address instantly.\n' +
      '• **Receive OTPs:** Read incoming verification codes right here.\n' +
      '• **Secure:** Emails are temporary and automatically deleted.\n\n' +
      'Click below to create your temporary inbox.'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '⚡ PrimeGen.eu PrimeMail • OTP Service',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('primemail_generate')
      .setLabel('✉️ Generate Temp Mail')
      .setStyle(ButtonStyle.Primary)
  );

  return { embed, components: [buttonRow] };
}

module.exports = { command, execute, buildBasicPanels, buildPremiumPanel, buildPrimePanel, buildTargxtPanel, buildPrimeMailPanel };
