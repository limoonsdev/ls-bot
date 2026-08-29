const { SlashCommandBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('avis')
  .setDescription('Laissez un avis / review sur DreamShop !')
  .addIntegerOption(option => 
    option.setName('note')
      .setDescription('Votre note sur 5 (1 à 5)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(5))
  .addStringOption(option => 
    option.setName('commentaire')
      .setDescription('Votre commentaire ou proof')
      .setRequired(true));

async function execute(interaction) {
  const note = interaction.options.getInteger('note');
  const commentaire = interaction.options.getString('commentaire');
  
  const REVIEW_CHANNEL_ID = process.env.REVIEW_CHANNEL_ID || '1537555746122629160';
  let avisChannel = await interaction.guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null);
  
  if (!avisChannel) {
    avisChannel = interaction.guild.channels.cache.find(c => 
      c.isTextBased() && ['avis', 'proof', 'proofs', 'feedback', 'reviews'].includes(c.name.toLowerCase())
    );
  }
  
  if (!avisChannel) {
    return interaction.reply({ content: "❌ Salon d'avis introuvable sur ce serveur.", flags: 64 });
  }

  try {
    const webhooks = await avisChannel.fetchWebhooks().catch(() => null);
    let webhook = webhooks?.find(wh => wh.token);
    
    if (!webhook) {
      webhook = await avisChannel.createWebhook({
        name: 'DreamShop Avis',
        avatar: interaction.client.user.displayAvatarURL(),
      });
    }

    const stars = '⭐'.repeat(note) + '☆'.repeat(5 - note);

    await webhook.send({
      content: `**Note :** ${stars}\n\n${commentaire}`,
      username: interaction.member?.displayName || interaction.user.username,
      avatarURL: interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
    });

    await interaction.reply({ content: `✅ Merci pour votre avis ! Il a été publié dans ${avisChannel}.`, flags: 64 });
    logger.info('Avis', `Nouvel avis laissé par ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Avis', `Erreur lors de l'envoi de l'avis: ${error.message}`);
    await interaction.reply({ content: `❌ Erreur: ${error.message}`, flags: 64 });
  }
}

module.exports = {
  command,
  data: command,
  execute
};
