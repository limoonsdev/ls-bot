const { SlashCommandBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const logger = getLogger();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avis')
    .setDescription('Laissez un avis sur notre service !')
    .addIntegerOption(option => 
      option.setName('note')
        .setDescription('Votre note sur 5')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5))
    .addStringOption(option => 
      option.setName('commentaire')
        .setDescription('Votre commentaire')
        .setRequired(true)),
        
  async execute(interaction) {
    const note = interaction.options.getInteger('note');
    const commentaire = interaction.options.getString('commentaire');
    
    // Find the review channel
    const avisChannel = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('avis'));
    
    if (!avisChannel) {
      return interaction.reply({ content: "❌ Salon d'avis introuvable sur ce serveur.", ephemeral: true });
    }

    try {
      // Get or create Webhook
      const webhooks = await avisChannel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.token);
      
      if (!webhook) {
        webhook = await avisChannel.createWebhook({
          name: 'PrimeGen Avis',
          avatar: interaction.client.user.displayAvatarURL(),
        });
      }

      const stars = '⭐'.repeat(note) + '☆'.repeat(5 - note);

      await webhook.send({
        content: `**Note :** ${stars}\n\n${commentaire}`,
        username: interaction.member?.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ dynamic: true, size: 256 })
      });

      await interaction.reply({ content: `✅ Merci pour votre avis ! Il a été publié dans ${avisChannel}.`, ephemeral: true });
      logger.info('Avis', `Nouvel avis laissé par ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Avis', `Erreur lors de l'envoi de l'avis: ${error.message}`);
      await interaction.reply({ content: `❌ Erreur: ${error.message}`, ephemeral: true });
    }
  }
};
