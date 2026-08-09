const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { parseTime } = require('../utils/timeParser');

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('🎉 Start an advanced giveaway')
  .setDefaultMemberPermissions('8')
  .addStringOption(option =>
    option.setName('prize')
      .setDescription('The prize to win')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('duration')
      .setDescription('Giveaway duration (e.g., 1h, 24h, 30m)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('winners')
      .setDescription('Number of winners to pick')
      .setMinValue(1)
      .setMaxValue(50)
      .setRequired(true))
  .addRoleOption(option =>
    option.setName('ping')
      .setDescription('Role to ping (default: no ping)')
      .setRequired(false));

async function execute(interaction) {
  const prize = interaction.options.getString('prize');
  const durationStr = interaction.options.getString('duration');
  const winnersCount = interaction.options.getInteger('winners');
  const pingRole = interaction.options.getRole('ping');
  
  const msDuration = parseTime(durationStr);
  if (!msDuration) {
    return interaction.reply({ content: '❌ Invalid duration format (e.g., 1m, 1h, 24h).', ephemeral: true });
  }

  const endTime = Math.floor((Date.now() + msDuration) / 1000);

  const embed = new EmbedBuilder()
    .setTitle('🎉 **PRIMEGEN GIVEAWAY** 🎉')
    .setDescription(
      `> 🎁 **Prize:** **${prize}**\n` +
      `> 🏆 **Winner(s):** \`${winnersCount}\`\n` +
      `> ⏳ **Ends:** <t:${endTime}:R> (<t:${endTime}:f>)\n` +
      `> 👑 **Hosted by:** ${interaction.user}\n\n` +
      '**To participate:**\n' +
      'React with 🎉 under this message!'
    )
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'PrimeGen • Giveaway System' })
    .setTimestamp();
    
  const pingText = pingRole ? `<@&${pingRole.id}>` : '';
  const message = await interaction.reply({ content: `🎉 **NEW GIVEAWAY!** ${pingText}`, embeds: [embed], fetchReply: true });
  await message.react('🎉');

  // Wait for the giveaway to end
  setTimeout(async () => {
    try {
      const fetchedMessage = await interaction.channel.messages.fetch(message.id).catch(() => null);
      if (!fetchedMessage) return; // Message deleted

      const reaction = fetchedMessage.reactions.cache.get('🎉');
      if (!reaction) return;
      
      const users = await reaction.users.fetch();
      // Exclude bots
      const validParticipants = Array.from(users.filter(u => !u.bot).values());
      
      if (validParticipants.length === 0) {
        const noParticipantsEmbed = new EmbedBuilder()
          .setTitle('🎉 **GIVEAWAY CANCELLED**')
          .setDescription(`> 🎁 **Prize:** **${prize}**\n\nNobody participated in the giveaway!`)
          .setColor(COLORS.ERROR)
          .setFooter({ text: 'PrimeGen • Giveaway System' })
          .setTimestamp();
        
        await fetchedMessage.edit({ content: '~~🎉 **NEW GIVEAWAY!**~~ (Ended)', embeds: [noParticipantsEmbed] });
        return interaction.channel.send({ content: `🥲 No one participated in the giveaway for **${prize}**...` });
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
        .setTitle('🎉 **GIVEAWAY ENDED** 🎉')
        .setDescription(
          `> 🎁 **Prize:** **${prize}**\n` +
          `> 🏆 **Winner(s):** ${winnersMention}\n` +
          `> 👑 **Hosted by:** ${interaction.user}`
        )
        .setColor(COLORS.SUCCESS)
        .setImage(PANEL_BANNER_URL)
        .setFooter({ text: 'PrimeGen • Giveaway System' })
        .setTimestamp();

      await fetchedMessage.edit({ content: '🎉 **GIVEAWAY ENDED!**', embeds: [endEmbed] });
      await interaction.channel.send({ content: `Congratulations ${winnersMention}! You won the **${prize}**! 🎊\n*Please open a ticket to claim your prize!*` });
    } catch (error) {
      console.error('Error ending giveaway:', error);
    }
  }, msDuration);
}

module.exports = { command, execute };
