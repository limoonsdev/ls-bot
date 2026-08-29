/**
 * =====================================================
 * BUTTON INTERACTION HANDLERS - ULTRA PREMIUM
 * =====================================================
 */

const { getLogger } = require('../../utils/logger');
const { EMOJIS } = require('../../config/constants');
const { getServiceById } = require('../../config/services');
const { query } = require('../../database/hybridPool');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getOrCreateGuildConfig } = require('../../database/models');
const { formatTime } = require('../../utils/timeParser');

const logger = getLogger();
const userCooldowns = new Map(); // Store cooldowns: userCooldowns.get(userId) = { free: timestamp, premium: timestamp }
const userDailyCounts = new Map(); // Store daily counts: userDailyCounts.get(userId) = { date: 'YYYY-MM-DD', free: count, premium: count }


function registerButtonHandlers(client) {
  logger.info('ButtonHandlers', 'Button handlers registered');
}

async function handleButton(interaction) {
  const customId = interaction.customId;

  try {
    if (customId.startsWith('gen_free_') || customId.startsWith('gen_premium_') || customId.startsWith('gen_prime_')) {
      await handleGenButton(interaction);
    } else if (customId === 'lang_fr' || customId === 'lang_en') {
      await handleLanguageSwitch(interaction);
    
    } else if (customId.startsWith('server_leave_')) {
      await handleServerLeave(interaction);
    } else if (customId === 'verify_user') {
      await handleVerifyButton(interaction);
    } else if (customId === 'verify_manual') {
      await handleVerifyManual(interaction);
    } else if (customId.startsWith('manual_accept_')) {
      await handleManualAccept(interaction);
    } else if (customId.startsWith('manual_reject_')) {
      await handleManualReject(interaction);
    } else if (customId === 'ticket_create') {
      await handleTicketButton(interaction);
    } else if (customId === 'ticket_close') {
      await handleTicketClose(interaction);
    } else if (customId === 'shop_order_boosts') {
      await handleShopOrder(interaction);
    } else if (customId.startsWith('shop_paypal_paid_')) {
      await handleShopPaypalPaid(interaction);
    } else if (customId.startsWith('shop_ltc_check_')) {
      await handleShopLtcCheck(interaction);
    } else if (customId.startsWith('shop_submit_payment_')) {
      await handleShopSubmitPayment(interaction);
    } else if (customId.startsWith('shop_approve_')) {
      await handleShopApprove(interaction);
    } else if (customId.startsWith('shop_reject_')) {
      await handleShopReject(interaction);
    } else if (customId.startsWith('config_')) {
      const configHandler = require('../../commands/config');
      await configHandler.handleConfigButton(interaction);
    } else if (customId === 'prime_stock_upload') {
      await handlePrimeStockUpload(interaction);
    } else if (customId === 'prime_stock_refresh') {
      await handlePrimeStockRefresh(interaction);
    } else if (customId.startsWith('tool_')) {
      await handlePrimeTools(interaction);
    } else if (customId.startsWith('freegen_')) {
      await handleFreegenButton(interaction);
    } else if (customId === 'freegen_prev' || customId === 'freegen_next') {
      await handleFreegenNav(interaction);
    } else {
      logger.warn('ButtonHandlers', `Unknown button: ${customId}`);
    }
  } catch (error) {
    logger.error('ButtonHandlers', `Error handling button ${customId}`, { error: error.message });
    
    const reply = {
      content: `${EMOJIS.ERROR} An error occurred: ${error.message}`,
      flags: 64
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}

async function handleGenButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  const parts = interaction.customId.split('_');
  const tier = parts[1];
  const serviceId = parts.slice(2).join('_');
  const userId = interaction.user.id;
  const now = Date.now();
  const vanityTags = ['.gg/shop2rv', '.gg/dreamshop', 'shop2rv', 'dreamshop'];
  const checkVanity = (str) => str && vanityTags.some(tag => str.toLowerCase().includes(tag.toLowerCase()));
  const customStatus = interaction.member.presence?.activities.find(a => a.type === 4); // 4 = Custom Status
  const hasVanity = customStatus && checkVanity(customStatus.state);
  const hasFreeRole = interaction.member.roles.cache.has('1532347064623698010');

  if (!hasVanity && !hasFreeRole) {
    return interaction.editReply({
      content: '❌ **Accès Refusé !** Vous devez mettre `.gg/shop2rv` dans votre statut personnalisé Discord pour utiliser le générateur ! (Obligatoire 💎)'
    });
  }

  // Check VIP/Premium role if tier is premium or prime
  if ((tier === 'premium' || tier === 'prime') && !interaction.member.roles.cache.has('1532346926425444474')) {
    return interaction.editReply({
      content: '❌ **Accès Refusé !** Vous n\'avez pas le rôle VIP/Premium ! Veuillez souscrire sur la boutique avant de générer sur ce panel.'
    });
  }

  // Check Free role if tier is free
  let hasFreeAccess = interaction.member.roles.cache.has('1532347064623698010');
  
  // Fallback: Check custom status directly if role is missing
  if (!hasFreeAccess && interaction.member.presence && interaction.member.presence.activities) {
    for (const activity of interaction.member.presence.activities) {
      if (activity.type === 4 && checkVanity(activity.state)) {
        hasFreeAccess = true;
        break;
      }
    }
  }

  if (tier === 'free' && !hasFreeAccess) {
    return interaction.editReply({
      content: '❌ Vous n\'avez pas accès à ce panel ! Mettez `.gg/shop2rv` dans votre statut ou assurez-vous d\'avoir le rôle Free.'
    });
  }

  // Cooldown Check
  if (interaction.guild) {
    const config = await getOrCreateGuildConfig(interaction.guild.id);
    const confData = config.config_data || {};
    let cdFree = confData.cooldown_free ?? 600000;
    let cdPremium = confData.cooldown_premium ?? 60000;

    // Apply custom role cooldowns
    if (confData.cooldown_roles && Object.keys(confData.cooldown_roles).length > 0) {
      let lowestCustomCd = Infinity;
      for (const [roleId, time] of Object.entries(confData.cooldown_roles)) {
        if (interaction.member.roles.cache.has(roleId)) {
          if (time < lowestCustomCd) lowestCustomCd = time;
        }
      }
      if (lowestCustomCd !== Infinity) {
        cdFree = lowestCustomCd;
        cdPremium = lowestCustomCd;
      }
    }
    
    let userCd = userCooldowns.get(userId) || { free: 0, premium: 0 };
    let nextAllowed = (tier === 'premium' || tier === 'prime') ? userCd.premium : (tier === 'free' ? userCd.free : 0);
    
    if (now < nextAllowed) {
      const remainingMs = nextAllowed - now;
      return interaction.editReply({
        content: `${EMOJIS.COOLDOWN} **Cooldown !** Tu dois attendre encore **${formatTime(remainingMs)}** avant de générer sur ce panel.`
      });
    }

    // Set new cooldown based on tier
    if (tier === 'free') userCd.free = now + cdFree;
    else if (tier === 'premium' || tier === 'prime') userCd.premium = now + cdPremium;
    userCooldowns.set(userId, userCd);

    // Daily Limit Check
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitFree = confData.daily_limit_free !== undefined ? confData.daily_limit_free : 10;
    const limitPremium = confData.daily_limit_premium !== undefined ? confData.daily_limit_premium : 50;

    let userDaily = userDailyCounts.get(userId) || { date: today, free: 0, premium: 0 };
    if (userDaily.date !== today) {
      userDaily = { date: today, free: 0, premium: 0 };
    }

    if (tier === 'free' && limitFree !== 0 && userDaily.free >= limitFree) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} **Limite atteinte !** Tu as utilisé toutes tes générations Free d'aujourd'hui (${limitFree}/${limitFree}). Reviens demain !`
      });
    } else if ((tier === 'premium' || tier === 'prime') && limitPremium !== 0 && userDaily.premium >= limitPremium) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} **Limite atteinte !** Tu as utilisé toutes tes générations Premium d'aujourd'hui (${limitPremium}/${limitPremium}). Reviens demain !`
      });
    }

    // Increment daily usage
    if (tier === 'free') userDaily.free += 1;
    else if (tier === 'premium' || tier === 'prime') userDaily.premium += 1;
    userDailyCounts.set(userId, userDaily);
  }

  const service = getServiceById(serviceId);
  if (!service) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} Service not found!`
    });
  }

  const stockResult = await query('SELECT COUNT(*) as count FROM combos WHERE service_id = $1', [serviceId]);
  const stock = stockResult.rows[0]?.count || 0;

  if (stock === 0) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} **${service.label}** is currently out of stock!\n${EMOJIS.INFO} Come back later.`
    });
  }

  const comboResult = await query(
    'SELECT id, combo, account_info FROM combos WHERE service_id = $1 ORDER BY id ASC LIMIT 1',
    [serviceId]
  );

  if (!comboResult.rows || comboResult.rows.length === 0) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} Cannot retrieve an account right now.`
    });
  }

  const account = comboResult.rows[0];
  await query('DELETE FROM combos WHERE id = $1', [account.id]);

  try {
    const remainingStock = Math.max(0, stock - 1);
    const dmEmbed = buildFrenchGenEmbed(service.label, account.combo, account.account_info, remainingStock);
    
    const languageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lang_fr')
        .setLabel('🇫🇷 Français')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('lang_en')
        .setLabel('🇬🇧 English')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.user.send({ embeds: [dmEmbed], components: [languageRow] });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **${service.label}** a été envoyé dans vos messages privés !\n${EMOJIS.INFO} Veuillez vérifier vos DMs.`
    });

    logger.info('Gen', `Account generated for ${interaction.user.tag}`, {
      service: serviceId,
      tier,
      guild: interaction.guild?.id
    });
    
    if (interaction.guild) {
      // 1. Send detailed combo log to Discord log channel
      const { sendGenLog } = require('../../utils/discordLogger');
      await sendGenLog(
        interaction.guild,
        interaction.user,
        service,
        account.combo,
        tier
      );

      // 2. Ping user in proof/avis channel and auto-delete ping after 10s
      await pingUserInProofChannel(interaction.guild, interaction.user, service);
    }
    
    // Save to user_history
    const { addUserHistory } = require('../../database/models');
    await addUserHistory(interaction.user.id, serviceId, 'GENERATION', { combo: account.combo, tier });

  } catch (dmError) {
    logger.error('Gen', 'Could not send DM', { error: dmError.message });
    
    // Restore combo to DB if DM failed
    await query(
      'INSERT INTO combos (service_id, combo, account_info) VALUES ($1, $2, $3)',
      [serviceId, account.combo, account.account_info]
    );

    await interaction.editReply({
      content: `${EMOJIS.ERROR} Impossible de vous envoyer un message privé !\n${EMOJIS.INFO} Veuillez ouvrir vos messages privés (Paramètres > Confidentialité) et réessayer.`
    });
  }
}

function buildFrenchGenEmbed(serviceLabel, combo, accountInfo, remainingStock) {
  const { EmbedBuilder } = require('discord.js');
  return new EmbedBuilder()
    .setTitle(`🎁 DreamShop • Compte ${serviceLabel}`)
    .setDescription(
      `### ⚡ Félicitations ! Voici vos identifiants :\n\n` +
      `**🛠️ Service :** \`${serviceLabel}\`\n\n` +
      `**🔑 Compte (Copier-Coller) :**\n` +
      `\`\`\`fix\n${combo}\n\`\`\`\n` +
      (accountInfo ? `ℹ️ **Informations :** \`${accountInfo}\`\n\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⚠️ **RAPPEL OBLIGATOIRE (AVIS SOUS 24H) :**\n` +
      `> 📝 Vous devez poster un avis dans <#1532367074125545673> sous **24 heures** !\n` +
      `> 🚨 **Attention :** En cas d'absence d'avis sous 24h, vous recevrez un avertissement.\n\n` +
      `💡 **Conseils de sécurité :**\n` +
      `• Modifiez le mot de passe et l'adresse email dès que possible.\n` +
      `• Ne partagez pas ces identifiants.\n\n` +
      `📦 **Stock restant en direct :** \`${remainingStock}\``
    )
    .setColor(0x57F287)
    .setImage('https://i.ibb.co/FbpXzSZ7/standard-8.gif')
    .setFooter({ text: 'DreamShop Generator • Statut: .gg/shop2rv', iconURL: 'https://i.ibb.co/FbpXzSZ7/standard-8.gif' })
    .setTimestamp();
}

function buildEnglishGenEmbed(serviceLabel, combo, accountInfo, remainingStock) {
  const { EmbedBuilder } = require('discord.js');
  return new EmbedBuilder()
    .setTitle(`🎁 DreamShop • ${serviceLabel} Account`)
    .setDescription(
      `### ⚡ Congratulations! Here are your credentials:\n\n` +
      `**🛠️ Service:** \`${serviceLabel}\`\n\n` +
      `**🔑 Account (Copy-Paste):**\n` +
      `\`\`\`fix\n${combo}\n\`\`\`\n` +
      (accountInfo ? `ℹ️ **Information:** \`${accountInfo}\`\n\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `⚠️ **MANDATORY NOTICE (REVIEW WITHIN 24H):**\n` +
      `> 📝 You must leave a review / proof in <#1532367074125545673> within **24 hours**!\n` +
      `> 🚨 **Warning:** If you fail to do so within 24h, you will receive a warning.\n\n` +
      `💡 **Security Tips:**\n` +
      `• Change the password and email immediately if possible.\n` +
      `• Do not share this account with anyone.\n\n` +
      `📦 **Live stock remaining:** \`${remainingStock}\``
    )
    .setColor(0x5865F2)
    .setImage('https://i.ibb.co/FbpXzSZ7/standard-8.gif')
    .setFooter({ text: 'DreamShop Generator • Status: .gg/shop2rv', iconURL: 'https://i.ibb.co/FbpXzSZ7/standard-8.gif' })
    .setTimestamp();
}

async function handleLanguageSwitch(interaction) {
  try {
    const isFrench = interaction.customId === 'lang_fr';
    const embed = interaction.message.embeds[0];
    if (!embed) return interaction.deferUpdate();

    let combo = 'N/A';
    const match = embed.description ? embed.description.match(/```(?:fix)?\n?([\s\S]*?)\n?```/) : null;
    if (match) {
      combo = match[1].trim();
    } else {
      const inlineMatch = embed.description ? embed.description.match(/`([^`\n]+:[^`\n]+)`/) : null;
      if (inlineMatch) combo = inlineMatch[1].trim();
    }

    const rawTitle = embed.title || '';
    const serviceLabel = rawTitle
      .replace(/^🎁\s*DreamShop\s*•\s*/, '')
      .replace(/^(Compte\s*)/i, '')
      .replace(/(\s*Account)$/i, '')
      .replace(/\s*\((Compte Généré|Generated Account)\)$/i, '')
      .trim() || 'Service';

    const infoMatch = embed.description ? embed.description.match(/ℹ️ \*\*Information[s]? :\*\* `([^`]+)`/) : null;
    const accountInfo = infoMatch ? infoMatch[1] : '';

    const stockMatch = embed.description ? embed.description.match(/📦 \*\*Stock (?:restant en direct|restant|remaining|Live stock remaining) :\*\* `?(\d+)`?/) : null;
    const remainingStock = stockMatch ? stockMatch[1] : '0';

    const newEmbed = isFrench 
      ? buildFrenchGenEmbed(serviceLabel, combo, accountInfo, remainingStock)
      : buildEnglishGenEmbed(serviceLabel, combo, accountInfo, remainingStock);

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const languageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('lang_fr')
        .setLabel('🇫🇷 Français')
        .setStyle(isFrench ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('lang_en')
        .setLabel('🇬🇧 English')
        .setStyle(isFrench ? ButtonStyle.Secondary : ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [newEmbed], components: [languageRow] });
  } catch (err) {
    logger.error('LanguageSwitch', 'Failed to switch language', { error: err.message });
  }
}

async function pingUserInProofChannel(guild, user, service) {
  if (!guild) return;

  try {
    const REVIEW_CHANNEL_ID = '1532367074125545673';
    let proofChannel = await guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null);

    if (!proofChannel) {
      proofChannel = guild.channels.cache.find(c => 
        c.isTextBased() && ['proof', 'proofs', 'avis', 'feedback', 'reputation', 'avis-clients', 'proof-gen', 'proofs-gen'].includes(c.name.toLowerCase())
      );
    }

    if (proofChannel) {
      const pingMsg = await proofChannel.send(
        `Hey ${user}! 🎁 Don't forget to leave your review / proof in <#${REVIEW_CHANNEL_ID}> within **24h** for your generation of **${service.label}**!\n⚠️ **If you don't do it within 24h, you will receive a warning.**\n\n🇫🇷 N'oublie pas de laisser ton avis / proof sous **24h** !\n⚠️ **En cas de non-respect, tu recevras un avertissement.**`
      ).catch(() => null);

      if (pingMsg) {
        setTimeout(() => {
          pingMsg.delete().catch(() => {});
        }, 10000);
      }
    }
  } catch (err) {
    logger.error('ProofPing', 'Failed to ping user in proof channel', { error: err.message });
  }
}

async function handleVerifyButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  const member = interaction.member;
  const verifiedRoleId = '1532346852203040768';

  if (member.roles.cache.has(verifiedRoleId)) {
    return interaction.editReply({
      content: `${EMOJIS.SUCCESS} You are already verified!`
    });
  }

  try {
    await member.roles.add(verifiedRoleId);
    const membresRoleId = '1532391228040282232';
    await member.roles.add(membresRoleId).catch(() => {});
    
    const notRegisteredRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
    if (notRegisteredRole) {
      await member.roles.remove(notRegisteredRole).catch(() => {});
    }
    
    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **Verification successful!**\n${EMOJIS.INFO} Welcome to DreamShop!`
    });

    logger.info('Verify', `User verified: ${member.user.tag}`, { guild: interaction.guild.id, user: member.id });
    await sendWelcomeMessage(interaction.guild, member);
    
    if (interaction.guild) {
      const { sendDiscordLog } = require('../../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Member Verified',
        `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Type:** Automatic Verification`,
        0x57F287
      );
    }
  } catch (error) {
    logger.error('Verify', 'Verification failed', { error: error.message });
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Error during verification.`
    });
  }
}

async function handleVerifyManual(interaction) {
  await interaction.reply({
    content: `${EMOJIS.SUCCESS} Your manual verification request has been sent to the staff. Please wait.`,
    flags: 64
  });

  const logChannelId = '1532375665544925408';
  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('👀 Manual Verification Request')
    .setDescription(`**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Account Created:** <t:${Math.floor(interaction.user.createdAt.getTime() / 1000)}:R>`)
    .setColor(0xFEE75C)
    .setTimestamp();

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`manual_accept_${interaction.user.id}`)
    .setLabel('✅ Accept')
    .setStyle(ButtonStyle.Success);
  
  const rejectBtn = new ButtonBuilder()
    .setCustomId(`manual_reject_${interaction.user.id}`)
    .setLabel('❌ Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  await logChannel.send({ embeds: [embed], components: [row] });
}

async function handleManualAccept(interaction) {
  const userId = interaction.customId.split('_')[2];
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  
  const { EmbedBuilder } = require('discord.js');
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x57F287)
    .setDescription(interaction.message.embeds[0].description + `\n\n✅ **Accepted by:** ${interaction.user}`);

  await interaction.update({ embeds: [embed], components: [] });

  if (member) {
    const verifiedRoleId = '1532346852203040768';
    const membresRoleId = '1532391228040282232';
    await member.roles.add(verifiedRoleId).catch(() => {});
    await member.roles.add(membresRoleId).catch(() => {});
    
    const notRegisteredRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
    if (notRegisteredRole) {
      await member.roles.remove(notRegisteredRole).catch(() => {});
    }

    await member.send('✅ You have been manually verified by staff. Welcome!').catch(() => {});
    await sendWelcomeMessage(interaction.guild, member);
    
    const { sendDiscordLog } = require('../../utils/discordLogger');
    await sendDiscordLog(
      interaction.guild,
      'Member Verified',
      `**User:** ${member.user} (\`${member.user.id}\`)\n**Type:** Manual Verification\n**Staff:** ${interaction.user}`,
      0x57F287
    );
  }
}

async function handleManualReject(interaction) {
  const userId = interaction.customId.split('_')[2];
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  
  const { EmbedBuilder } = require('discord.js');
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xED4245)
    .setDescription(interaction.message.embeds[0].description + `\n\n❌ **Rejected by:** ${interaction.user}`);

  await interaction.update({ embeds: [embed], components: [] });

  if (member) {
    await member.send('❌ Your manual verification request was rejected.').catch(() => {});
  }
}

async function handleTicketButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    // Check if category exists, or create it
    let ticketCategory = interaction.guild.channels.cache.find(c => c.type === 4 && c.name.toLowerCase().includes('ticket'));
    
    if (!ticketCategory) {
      ticketCategory = await interaction.guild.channels.create({
        name: '🎫 TICKETS',
        type: 4, // 4 is Category
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
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

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const { COLORS, PANEL_BANNER_URL } = require('../../config/constants');

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`🎫 Ticket - ${interaction.user.username}`)
      .setDescription(
        `**Welcome to your ticket, ${interaction.user}!**\n\n` +
        '> 💡 **Please describe your request in detail.**\n' +
        '> ⏳ A staff member will be with you shortly.\n\n' +
        '*Click the button below when you are ready to close this ticket.*'
      )
      .setColor(COLORS.INFO)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: 'DreamShop Support' })
      .setTimestamp();
      
    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [closeBtn] });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} Ticket created: ${ticketChannel}`
    });

    logger.info('Ticket', `Ticket created by ${interaction.user.tag}`, {
      guild: interaction.guild.id,
      channel: ticketChannel.id
    });
    
    const { sendDiscordLog } = require('../../utils/discordLogger');
    await sendDiscordLog(
      interaction.guild,
      'Ticket Created',
      `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Channel:** ${ticketChannel}`,
      COLORS.INFO
    );
  } catch (error) {
    logger.error('Ticket', 'Ticket creation failed', { error: error.message });
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Error during ticket creation.`
    });
  }
}

async function handleTicketClose(interaction) {
  await interaction.deferReply();
  
  try {
    await interaction.editReply('🔒 Closing ticket in 3 seconds...');
    
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (err) {
        logger.error('Ticket', 'Failed to delete ticket channel', { error: err.message });
      }
    }, 3000);
    
    logger.info('Ticket', `Ticket closed by ${interaction.user.tag}`, {
      channel: interaction.channel.name
    });
    
    if (interaction.guild) {
      const { sendDiscordLog } = require('../../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Ticket Closed',
        `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Channel:** ${interaction.channel.name}`,
        0xED4245
      );
    }
  } catch (error) {
    logger.error('Ticket', 'Error closing ticket', { error: error.message });
  }
}

// ==========================================
// SHOP HANDLERS
// ==========================================

async function handleShopOrder(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('shop_order_modal')
    .setTitle('Order Discord Boosts');

  const quantityInput = new TextInputBuilder()
    .setCustomId('boost_quantity')
    .setLabel('How many boosts? (e.g., 2, 14)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(3);

  const durationInput = new TextInputBuilder()
    .setCustomId('boost_duration')
    .setLabel('Duration in months? (1 or 3)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  modal.addComponents(
    new ActionRowBuilder().addComponents(quantityInput),
    new ActionRowBuilder().addComponents(durationInput)
  );

  await interaction.showModal(modal);
}

async function handleShopSubmitPayment(interaction) {
  const orderId = interaction.customId.replace('shop_submit_payment_', '');
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`shop_proof_modal_${orderId}`)
    .setTitle('Submit Payment Proof');

  const methodInput = new TextInputBuilder()
    .setCustomId('payment_method')
    .setLabel('Payment Method (PayPal, Rewarble, Robux)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const proofInput = new TextInputBuilder()
    .setCustomId('payment_proof')
    .setLabel('Transaction ID / Giftcard Code / Username')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(200);

  const imageInput = new TextInputBuilder()
    .setCustomId('payment_image_url')
    .setLabel('Image Proof URL (Imgur, Discord) Optional')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(300);

  modal.addComponents(
    new ActionRowBuilder().addComponents(methodInput),
    new ActionRowBuilder().addComponents(proofInput),
    new ActionRowBuilder().addComponents(imageInput)
  );

  await interaction.showModal(modal);
}

async function handleShopPaypalPaid(interaction) {
  const orderId = interaction.customId.replace('shop_paypal_paid_', '');
  await interaction.deferReply({ flags: 64 });

  try {
    const { query } = require('../../database/hybridPool');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const { COLORS, PANEL_BANNER_URL } = require('../../config/constants');

    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [orderId]);
    const order = orderDb.rows[0];

    if (!order) {
      return interaction.editReply({ content: '❌ Commande introuvable.' });
    }

    await query('UPDATE orders SET status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $3', ['PENDING_VERIFICATION', 'PAYPAL', orderId]);

    const staffEmbed = new EmbedBuilder()
      .setTitle('🚨 PAIEMENT PAYPAL SIGNALÉ (À VÉRIFIER)')
      .setDescription(
        `Le client <@${interaction.user.id}> a indiqué avoir envoyé son paiement PayPal !\n\n` +
        `> 👤 **Client :** <@${interaction.user.id}> (\`${interaction.user.tag}\` | \`${interaction.user.id}\`)\n` +
        `> 📦 **Article :** \`${order.product}\`\n` +
        `> 💶 **Montant :** \`${order.price} €\`\n` +
        `> 📝 **NOTE OBLIGATOIRE :** \`${orderId}\`\n\n` +
        `⚠️ **Action Staff :** Vérifiez sur votre compte PayPal que la transaction de **${order.price}€** avec la note **${orderId}** a bien été reçue.`
      )
      .setColor(COLORS.WARNING)
      .setImage(PANEL_BANNER_URL || null)
      .setFooter({ text: `Commande: ${orderId} • DreamShop Verification` })
      .setTimestamp();

    const staffButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_approve_${orderId}`)
        .setLabel('✅ Valider la Commande')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`shop_reject_${orderId}`)
        .setLabel('❌ Rejeter')
        .setStyle(ButtonStyle.Danger)
    );

    // Send staff alert into ticket channel
    await interaction.channel.send({
      content: `🔔 <@&1532347198975639582> <@&1532347155254087720> | Nouveau paiement PayPal à vérifier pour **${orderId}** !`,
      embeds: [staffEmbed],
      components: [staffButtons]
    });

    await interaction.editReply({
      content: `✅ **Paiement PayPal signalé avec succès !**\n\nLe staff a été notifié pour vérifier la réception des **${order.price}€** avec la note \`${orderId}\`. Votre commande sera validée dès confirmation.`
    });

    if (interaction.guild) {
      const { sendDiscordLog } = require('../../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Paiement PayPal Signalé',
        `Client: <@${interaction.user.id}> (${interaction.user.tag})\nCommande: \`${orderId}\`\nArticle: \`${order.product}\`\nPrix: \`${order.price}€\`\nNote: \`${orderId}\``,
        COLORS.WARNING
      );
    }
  } catch (error) {
    logger.error('Shop', 'PayPal paid error', { error: error.message });
    await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
  }
}

async function handleShopLtcCheck(interaction) {
  const orderId = interaction.customId.replace('shop_ltc_check_', '');
  await interaction.deferReply({ flags: 64 });

  try {
    const { query } = require('../../database/hybridPool');
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const { COLORS, PANEL_BANNER_URL } = require('../../config/constants');
    const { checkLtcPayment, LTC_ADDRESS } = require('../../services/cryptoService');

    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [orderId]);
    const order = orderDb.rows[0];

    if (!order) {
      return interaction.editReply({ content: '❌ Commande introuvable.' });
    }

    const expectedLtc = parseFloat(order.payment_proof) || (parseFloat(order.price) / 85.0);
    const orderTime = new Date(order.created_at).getTime();

    const result = await checkLtcPayment(expectedLtc, orderTime);

    if (result.found) {
      await query('UPDATE orders SET status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $3', ['PENDING_VERIFICATION', 'LTC', orderId]);

      const cryptoEmbed = new EmbedBuilder()
        .setTitle('💎 TRANSACTION LITECOIN DÉTECTÉE SUR LA BLOCKCHAIN !')
        .setDescription(
          `Une transaction correspondante a été trouvée sur le réseau Litecoin !\n\n` +
          `> 👤 **Client :** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n` +
          `> 📦 **Article :** \`${order.product}\`\n` +
          `> 💎 **Montant Reçu :** \`${result.amountLtc} LTC\`\n` +
          `> 📍 **Adresse :** \`${LTC_ADDRESS}\`\n` +
          `> 🔗 **Transaction (TXID) :** [Voir sur l'explorateur Blockchain](${result.explorerUrl})\n` +
          `> ⏳ **Statut Réseau :** ${result.confirmed ? '✅ **Confirmée** (Bloc: ' + result.blockHeight + ')' : '🔄 **Détectée dans le Mempool** (En attente de confirmation)'}\n\n` +
          `Le staff peut valider la commande immédiatement ci-dessous :`
        )
        .setColor(COLORS.SUCCESS)
        .setImage(PANEL_BANNER_URL || null)
        .setFooter({ text: `TXID: ${result.txid.substring(0, 16)}... • Litecoin Blockchain Verification` })
        .setTimestamp();

      const staffButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_approve_${orderId}`)
          .setLabel('✅ Valider la Commande')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`shop_reject_${orderId}`)
          .setLabel('❌ Rejeter')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.channel.send({
        content: `🔔 <@&1532347198975639582> <@&1532347155254087720> | Paiement Crypto LTC vérifié sur la Blockchain pour **${orderId}** !`,
        embeds: [cryptoEmbed],
        components: [staffButtons]
      });

      await interaction.editReply({
        content: `✅ **Transaction Litecoin confirmée sur la Blockchain !**\nTXID: \`${result.txid}\`\nLe staff a été notifié pour procéder à la livraison de votre commande.`
      });

      if (interaction.guild) {
        const { sendDiscordLog } = require('../../utils/discordLogger');
        await sendDiscordLog(
          interaction.guild,
          'Paiement LTC Détecté',
          `Client: <@${interaction.user.id}>\nCommande: \`${orderId}\`\nMontant: \`${result.amountLtc} LTC\`\nTXID: [${result.txid}](${result.explorerUrl})`,
          COLORS.SUCCESS
        );
      }
    } else {
      await interaction.editReply({
        content: `⏳ **Aucune transaction correspondante détectée sur l'adresse pour le moment.**\n\n` +
          `> 📍 Adresse attendue : \`${LTC_ADDRESS}\`\n` +
          `> 💎 Montant attendu : \`${expectedLtc.toFixed(6)} LTC\` (~${order.price}€)\n\n` +
          `💡 *Si vous venez d'effectuer le transfert depuis votre wallet ou exchange (Binance, Kraken, etc.), veuillez patienter 1 à 2 minutes que le réseau diffuse la transaction, puis recliquez sur "Vérifier le paiement LTC".*`
      });
    }
  } catch (error) {
    logger.error('Shop', 'LTC check error', { error: error.message });
    await interaction.editReply({ content: `❌ Erreur lors de la vérification LTC: ${error.message}` });
  }
}

async function handleShopApprove(interaction) {
  const dbId = interaction.customId.replace('shop_approve_', '');
  await interaction.deferReply({ flags: 64 });
  
  try {
    const { query } = require('../../database/hybridPool');
    const { EmbedBuilder } = require('discord.js');
    const { COLORS } = require('../../config/constants');
    
    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [dbId]);
    const order = orderDb.rows[0];
    
    if (!order || order.status === 'COMPLETED') {
      return interaction.editReply({ content: '❌ Commande introuvable ou déjà validée.' });
    }
    
    await query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $2', ['COMPLETED', dbId]);
    
    // Update staff embed in channel
    const msg = interaction.message;
    const staffEmbed = new EmbedBuilder()
      .setTitle('✅ COMMANDE VALIDÉE PAR LE STAFF')
      .setDescription(`Ce paiement a été vérifié et approuvé par <@${interaction.user.id}>.\nCommande ID: \`${dbId}\`\nProduit: **${order.product}**\nPrix: **${order.price}€**`)
      .setColor(COLORS.SUCCESS)
      .setTimestamp();
    await msg.edit({ embeds: [staffEmbed], components: [] });
    
    // DM the buyer
    try {
      const user = await interaction.client.users.fetch(order.user_id);
      const embed = new EmbedBuilder()
        .setTitle('✅ PAIEMENT APPROUVÉ • DREAMSHOP')
        .setDescription(`Félicitations <@${order.user_id}> ! 🎉\n\nVotre paiement pour **${order.product}** a été vérifié avec succès.\nUn membre de l'équipe va vous livrer vos accès et produits immédiatement !`)
        .setColor(COLORS.SUCCESS)
        .setImage(require('../../config/constants').PANEL_BANNER_URL || null)
        .setFooter({ text: `Commande: ${dbId} • DreamShop` })
        .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {
      // Ignore DM errors
    }
    
    await interaction.editReply({ content: `✅ Commande **${dbId}** approuvée avec succès !` });

    if (interaction.guild) {
      const { sendDiscordLog } = require('../../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Commande Validée',
        `Staff: <@${interaction.user.id}>\nClient: <@${order.user_id}>\nCommande: \`${dbId}\`\nProduit: \`${order.product}\``,
        COLORS.SUCCESS
      );
    }
  } catch (error) {
    await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
  }
}

async function handleShopReject(interaction) {
  const dbId = interaction.customId.replace('shop_reject_', '');
  await interaction.deferReply({ flags: 64 });
  
  try {
    const { query } = require('../../database/hybridPool');
    const { EmbedBuilder } = require('discord.js');
    const { COLORS } = require('../../config/constants');
    
    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [dbId]);
    const order = orderDb.rows[0];
    
    if (!order || order.status === 'REJECTED') {
      return interaction.editReply({ content: '❌ Commande introuvable ou déjà rejetée.' });
    }
    
    await query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $2', ['REJECTED', dbId]);
    
    // Update staff embed in channel
    const msg = interaction.message;
    const staffEmbed = new EmbedBuilder()
      .setTitle('❌ COMMANDE REJETÉE PAR LE STAFF')
      .setDescription(`Ce paiement a été rejeté par <@${interaction.user.id}>.\nCommande ID: \`${dbId}\``)
      .setColor(COLORS.ERROR)
      .setTimestamp();
    await msg.edit({ embeds: [staffEmbed], components: [] });
    
    // DM the buyer
    try {
      const user = await interaction.client.users.fetch(order.user_id);
      const embed = new EmbedBuilder()
        .setTitle('❌ PAIEMENT NON VALIDÉ • DREAMSHOP')
        .setDescription(`Bonjour <@${order.user_id}>,\n\nVotre paiement pour **${order.product}** n'a pas pu être validé.\nSi vous pensez qu'il s'agit d'une erreur, veuillez contacter le staff dans votre salon de commande.`)
        .setColor(COLORS.ERROR)
        .setFooter({ text: `Commande: ${dbId} • DreamShop` })
        .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {
      // Ignore DM errors
    }
    
    await interaction.editReply({ content: `❌ Commande **${dbId}** rejetée avec succès.` });
  } catch (error) {
    await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
  }
}

/**
 * Handle Prime Stock Upload - Modal for uploading prime accounts
 */
async function handlePrimeStockUpload(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
  
  // Check if user has admin permissions
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: '❌ You need Administrator permission to upload Prime stock!',
      flags: 64
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('prime_stock_upload_modal')
    .setTitle('📤 Upload Prime Stock');

  const serviceSelect = new TextInputBuilder()
    .setCustomId('prime_service')
    .setLabel('Service (fortnite_prime or valorant_prime)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter: fortnite_prime or valorant_prime')
    .setRequired(true)
    .setMaxLength(30);

  const accountsInput = new TextInputBuilder()
    .setCustomId('prime_accounts')
    .setLabel('Accounts (email:pass, one per line)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('email1:pass1\nemail2:pass2\nemail3:pass3')
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(serviceSelect),
    new ActionRowBuilder().addComponents(accountsInput)
  );

  await interaction.showModal(modal);
}

/**
 * Handle Prime Stock Refresh - Update the panel
 */
async function handlePrimeStockRefresh(interaction) {
  await interaction.deferUpdate();
  
  try {
    const { buildPrimeStockPanel } = require('../../commands/deploy');
    const panel = await buildPrimeStockPanel(interaction.guild);
    
    await interaction.editReply({ embeds: [panel.embed], components: panel.components });
  } catch (err) {
    console.error('Prime stock refresh error:', error);
    await interaction.followUp({ content: '❌ Failed to refresh panel', flags: 64 });
  }
}



async function handleFreegenButton(interaction) {
  await interaction.deferUpdate();

  const serviceId = interaction.customId.replace('freegen_', '');
  const { getServiceById } = require('../../config/services');
  const service = getServiceById(serviceId);
  if (!service) {
    return interaction.followUp({ content: '❌ Service not found.', flags: 64 });
  }

  // Remove components from the original ephemeral message
  await interaction.editReply({ components: [] }).catch(() => {});

  // Prepare DM embed with placeholder account info
  const { EmbedBuilder } = require('discord.js');
  const dmEmbed = new EmbedBuilder()
    .setColor(0x2F3136)
    .setTitle(`🎁 DreamShop • ${service.label} (Generated)`)
    .setDescription('Here is your generated account (placeholder).')
    .addFields({ name: 'Service', value: service.label, inline: true })
    .setFooter({ text: 'DreamShop Generator', iconURL: interaction.client.user.displayAvatarURL() })
    .setTimestamp();

  try {
    await interaction.user.send({ embeds: [dmEmbed] });
    await interaction.followUp({ content: '✅ Account sent to your DMs!', flags: 64 });
  } catch (err) {
    logger.error('Freegen', 'Failed to DM user', { error: err.message });
    await interaction.followUp({ content: '❌ Could not send DM. Please enable DMs from server members.', flags: 64 });
  }
}

async function handleFreegenNav(interaction) {
  await interaction.deferUpdate();
  const direction = interaction.customId === 'freegen_next' ? 1 : -1;

  // Retrieve current page from message embed footer
  const footerText = interaction.message.embeds[0]?.footer?.text || '';
  const match = footerText.match(/Page (\d+)\/(\d+)/);
  if (!match) return;
  let page = parseInt(match[1]) - 1;
  const totalPages = parseInt(match[2]);
  page += direction;
  if (page < 0) page = 0;
  if (page >= totalPages) page = totalPages - 1;

  const { getAllServices } = require('../../config/services');
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

  const services = getAllServices();
  const pageSize = 20;
  const pages = [];
  for (let i = 0; i < services.length; i += pageSize) {
    pages.push(services.slice(i, i + pageSize));
  }

  const pageServices = pages[page];
  const embed = new EmbedBuilder()
    .setColor(0x2F3136)
    .setTitle('🎁 DreamShop • Free Generator')
    .setDescription('Click a button below to generate an account for the selected service.')
    .setFooter({ text: `Page ${page + 1}/${totalPages} • DreamShop` })
    .setTimestamp();

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
  const navRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('freegen_prev').setLabel('⬅️ Prev').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('freegen_next').setLabel('Next ➡️').setStyle(ButtonStyle.Primary)
    );
  rows.push(navRow);

  await interaction.editReply({ embeds: [embed], components: rows });
}

module.exports = {
  registerButtonHandlers,
  handleButton
};


async function sendWelcomeMessage(guild, member) {
  try {
    const chatChannelId = '1535002094539505684';
    const chatChannel = guild.channels.cache.get(chatChannelId);
    if (!chatChannel) return;

    const { EmbedBuilder } = require('discord.js');
    const embedFr = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🇫🇷 Bienvenue ${member.user.username} !`)
      .setDescription(`Hey ${member}, bienvenue sur **DreamShop** !\n\nN'hésite pas à visiter notre **Shop** pour découvrir nos offres exclusives, et jette un œil aux **générateurs** pour obtenir tes comptes !\n\n*Si tu as une question, n'hésite pas à me mentionner ici pour parler avec l'IA !*`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
      
    const embedEn = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🇬🇧 Welcome ${member.user.username}!`)
      .setDescription(`Hey ${member}, welcome to **DreamShop**!\n\nDon't hesitate to check out our **Shop** for exclusive offers, and take a look at the **generators** to get your accounts!\n\n*If you have a question, feel free to mention me here to chat with the AI!*`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
      
    await chatChannel.send({ content: `${member}`, embeds: [embedFr, embedEn] });
  } catch (err) {
    // Ignore
  }
}


async function handleServerLeave(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.customId.replace('server_leave_', '');
  const guildToLeave = interaction.client.guilds.cache.get(guildId);
  
  if (!guildToLeave) {
    return interaction.editReply({ content: '❌ Impossible de trouver ce serveur. Le bot l\'a peut-être déjà quitté.' });
  }

  try {
    const name = guildToLeave.name;
    await guildToLeave.leave();
    await interaction.editReply({ content: `✅ Le bot a quitté le serveur **${name}** avec succès !` });
  } catch (err) {
    await interaction.editReply({ content: `❌ Erreur lors de la tentative de quitter le serveur : ${err.message}` });
  }
}


