const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { parseTime } = require('../utils/timeParser');

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('🎉 Lancer un concours / giveaway')
  .setDefaultMemberPermissions('8')
  .addStringOption(option =>
    option.setName('prize')
      .setDescription('Le prix à gagner')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('duration')
      .setDescription('Durée du concours (ex: 1h, 24h, 30m)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('winners')
      .setDescription('Nombre de gagnants')
      .setMinValue(1)
      .setMaxValue(50)
      .setRequired(true))
  .addRoleOption(option =>
    option.setName('ping')
      .setDescription('Rôle à mentionner (optionnel)')
      .setRequired(false));

async function execute(interaction) {
  const prize = interaction.options.getString('prize');
  const durationStr = interaction.options.getString('duration');
  const winnersCount = interaction.options.getInteger('winners');
  const pingRole = interaction.options.getRole('ping');
  
  const msDuration = parseTime(durationStr);
  if (!msDuration) {
    return interaction.reply({ content: '❌ Format de durée invalide (ex: 1m, 1h, 24h).', flags: 64 });
  }

  const endTime = Math.floor((Date.now() + msDuration) / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🎉 **DreamShop GIVEAWAY** 🎉')
    .setDescription(
      `> 🎁 **Prix:** **${prize}**\n` +
      `> 🏆 **Gagnant(s):** \`${winnersCount}\`\n` +
      `> ⏳ **Fin:** <t:${endTime}:R> (<t:${endTime}:f>)\n` +
      `> 👑 **Organisé par:** ${interaction.user}\n\n` +
      '**Pour participer :**\n' +
      'Réagissez avec 🎉 sous ce message !'
    )
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'DreamShop • Giveaway System', iconURL: PANEL_BANNER_URL })
    .setTimestamp();
    
  const pingText = pingRole ? `<@&${pingRole.id}>` : '';
  const message = await interaction.reply({ content: `🎉 **NOUVEAU GIVEAWAY !** ${pingText}`, embeds: [embed], fetchReply: true });
  await message.react('🎉');

  // Wait for the giveaway to end
  setTimeout(async () => {
    try {
      const fetchedMessage = await interaction.channel.messages.fetch(message.id).catch(() => null);
      if (!fetchedMessage) return; // Message deleted

      const reaction = fetchedMessage.reactions.cache.get('🎉');
      if (!reaction) return;
      
      const users = await reaction.users.fetch();
      const validParticipants = Array.from(users.filter(u => !u.bot).values());
      
      if (validParticipants.length === 0) {
        const noParticipantsEmbed = new EmbedBuilder()
          .setTitle('🎉 **GIVEAWAY TERMINÉ**')
          .setDescription(`> 🎁 **Prix:** **${prize}**\n\nAucun participant au giveaway !`)
          .setColor(COLORS.ERROR)
          .setFooter({ text: 'DreamShop • Giveaway System', iconURL: PANEL_BANNER_URL })
          .setTimestamp();
        
        await fetchedMessage.edit({ content: '~~🎉 **NOUVEAU GIVEAWAY !**~~ (Terminé)', embeds: [noParticipantsEmbed] });
        return interaction.channel.send({ content: `🥲 Personne n'a participé au concours pour **${prize}**...` });
      }

      // Pick random winners
      const winners = [];
      const numToPick = Math.min(winnersCount, validParticipants.length);
      
      for (let i = 0; i < numToPick; i++) {
        const randomIndex = Math.floor(Math.random() * validParticipants.length);
        winners.push(validParticipants[randomIndex]);
        validParticipants.splice(randomIndex, 1);
      }

      const winnersMention = winners.map(w => `<@${w.id}>`).join(', ');

      const endEmbed = new EmbedBuilder()
        .setTitle('🎉 **GIVEAWAY TERMINÉ** 🎉')
        .setDescription(
          `> 🎁 **Prix:** **${prize}**\n` +
          `> 🏆 **Gagnant(s):** ${winnersMention}\n` +
          `> 👑 **Organisé par:** ${interaction.user}`
        )
        .setColor(COLORS.SUCCESS)
        .setImage(PANEL_BANNER_URL)
        .setFooter({ text: 'DreamShop • Giveaway System', iconURL: PANEL_BANNER_URL })
        .setTimestamp();

      await fetchedMessage.edit({ content: '🎉 **GIVEAWAY TERMINÉ !**', embeds: [endEmbed] });
      await interaction.channel.send({ content: `Félicitations ${winnersMention} ! Vous avez gagné **${prize}** ! 🎊\n*Ouvrez un ticket pour réclamer votre récompense !*` });
    } catch (error) {
      console.error('Error ending giveaway:', error);
    }
  }, msDuration);
}

module.exports = { command, execute };
