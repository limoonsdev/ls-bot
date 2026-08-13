const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { COLORS, EMOJIS } = require('../config/constants');
const { query } = require('../database/hybridPool');
const crypto = require('crypto');

const logger = getLogger();

async function handlePrimeMailGenerate(interaction) {
  await interaction.deferReply({ ephemeral: true });

  // Optional: Check VIP/Premium if you want to restrict this feature
  /*
  const hasPremium = interaction.member.roles.cache.has('1532346926425444474');
  if (!hasPremium) {
    return interaction.editReply({ content: '❌ **Access Denied!** PrimeMail is a Premium feature.' });
  }
  */

  try {
    // Create table if it doesn't exist for saving emails
    await query(`
      CREATE TABLE IF NOT EXISTS prime_mails (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Domains supported by 1secmail
    const domains = ['1secmail.com', '1secmail.org', '1secmail.net', 'kzccv.com', 'qiott.com', 'wuuvo.com', 'zzyvc.com'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    const randomUsername = crypto.randomBytes(5).toString('hex');
    const emailAddress = `${randomUsername}@${randomDomain}`;

    // Save to DB
    await query('INSERT INTO prime_mails (user_id, email) VALUES ($1, $2)', [interaction.user.id, emailAddress]);

    const embed = new EmbedBuilder()
      .setTitle('✉️ PrimeMail Generated')
      .setDescription(
        `Here is your temporary email address:\n\n` +
        `**\`${emailAddress}\`**\n\n` +
        `*Click the button below to check your inbox for OTPs or verification links.*`
      )
      .setColor(COLORS.SUCCESS)
      .setFooter({ text: 'PrimeMail by PrimeGen.eu' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`primemail_check_${emailAddress}`)
        .setLabel('📥 Check Inbox')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    logger.info('PrimeMail', `Temp mail generated for ${interaction.user.tag}: ${emailAddress}`);

  } catch (error) {
    logger.error('PrimeMail', `Error generating mail: ${error.message}`);
    await interaction.editReply({ content: '❌ An error occurred while generating your PrimeMail.' });
  }
}

async function handlePrimeMailCheck(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const emailAddress = interaction.customId.replace('primemail_check_', '');
  const [login, domain] = emailAddress.split('@');

  try {
    // Fetch messages list
    const listRes = await fetch(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
    const messages = await listRes.json();

    if (!messages || messages.length === 0) {
      return interaction.editReply({
        content: `📭 **Inbox is empty for \`${emailAddress}\`**\n*Please wait a few seconds and try again.*`
      });
    }

    // Fetch the latest message details
    const latestMsg = messages[0]; // Messages are ordered by ID desc
    const msgRes = await fetch(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${latestMsg.id}`);
    const msgDetails = await msgRes.json();

    // Clean up body text (remove HTML tags if possible or just use textBody)
    const bodyText = msgDetails.textBody || msgDetails.body || 'No content';
    const cleanBody = bodyText.substring(0, 1000); // Discord embed limit is 4096, but we keep it shorter

    const embed = new EmbedBuilder()
      .setTitle(`📥 New Message Received`)
      .addFields(
        { name: 'From', value: msgDetails.from || 'Unknown', inline: true },
        { name: 'Subject', value: msgDetails.subject || 'No Subject', inline: true },
        { name: 'Date', value: msgDetails.date || 'Unknown', inline: true },
        { name: 'Message', value: `\`\`\`text\n${cleanBody}\n\`\`\`` }
      )
      .setColor(COLORS.INFO)
      .setFooter({ text: `Inbox: ${emailAddress}` })
      .setTimestamp();

    // Re-add the check button so they can keep checking
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`primemail_check_${emailAddress}`)
        .setLabel('🔄 Refresh Inbox')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

  } catch (error) {
    logger.error('PrimeMail', `Error checking mail: ${error.message}`);
    await interaction.editReply({ content: '❌ An error occurred while checking your PrimeMail inbox.' });
  }
}

module.exports = {
  handlePrimeMailGenerate,
  handlePrimeMailCheck
};
