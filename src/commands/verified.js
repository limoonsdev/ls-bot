/**
 * =====================================================
 * VERIFIED COMMAND - LIST VERIFIED USERS
 * =====================================================
 * View all verified users via OAuth2
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');

const logger = getLogger();

/**
 * =====================================================
 * VERIFIED ADMIN
 * =====================================================
 *
 * PON AQUÍ LA ID DE DISCORD DE LA ÚNICA PERSONA
 * QUE PODRÁ USAR /verified
 *
 * Ejemplo:
 * const VERIFIED_ADMIN_ID = '123456789012345678';
 */

const VERIFIED_ADMIN_ID = '1178305844698435625';


/**
 * =====================================================
 * MULTILINGUAL ACCESS DENIED MESSAGE
 * =====================================================
 */

function getNoAdminMessage(locale) {
  const messages = {
    'es-ES': '🚫 No Puedes Ver Los Usuarios Verificados Si No Eres Admin',
    'es-419': '🚫 No Puedes Ver Los Usuarios Verificados Si No Eres Admin',

    'en-US': '🚫 You Cannot View Verified Users If You Are Not An Admin',
    'en-GB': '🚫 You Cannot View Verified Users If You Are Not An Admin',

    'fr': '🚫 Vous ne pouvez pas voir les utilisateurs vérifiés si vous n’êtes pas administrateur',

    'de': '🚫 Du kannst verifizierte Benutzer nicht sehen, wenn du kein Administrator bist',

    'it': '🚫 Non puoi visualizzare gli utenti verificati se non sei un amministratore',

    'pt-BR': '🚫 Você não pode ver os usuários verificados se não for administrador',
    'pt-PT': '🚫 Não podes ver os utilizadores verificados se não fores administrador',

    'nl': '🚫 Je kunt geverifieerde gebruikers niet bekijken als je geen beheerder bent',

    'pl': '🚫 Nie możesz wyświetlać zweryfikowanych użytkowników, jeśli nie jesteś administratorem',

    'ru': '🚫 Вы не можете просматривать подтвержденных пользователей, если вы не администратор',

    'tr': '🚫 Yönetici değilseniz doğrulanmış kullanıcıları görüntüleyemezsiniz',

    'ja': '🚫 管理者でない場合、認証済みユーザーを表示することはできません',

    'ko': '🚫 관리자가 아니면 인증된 사용자를 볼 수 없습니다',

    'zh-CN': '🚫 不是管理员不能查看已验证用户',
    'zh-TW': '🚫 不是管理員不能查看已驗證用戶',

    'ar': '🚫 لا يمكنك عرض المستخدمين الذين تم التحقق منهم إذا لم تكن مسؤولاً'
  };

  return messages[locale] || messages['en-US'];
}


/**
 * =====================================================
 * COMMAND
 * =====================================================
 */

const command = new SlashCommandBuilder()
  .setName('verified')
  .setDescription('👥 View verified users')
  .setDefaultMemberPermissions('8')

  .addIntegerOption(option =>
    option
      .setName('page')
      .setDescription('Page to display (default: 1)')
      .setMinValue(1)
      .setRequired(false)
  )

  .addBooleanOption(option =>
    option
      .setName('refresh')
      .setDescription('Refresh and assign roles')
      .setRequired(false)
  );


/**
 * =====================================================
 * EXECUTE
 * =====================================================
 */

async function execute(interaction) {
  try {

    /**
     * =================================================
     * SECURITY CHECK
     * =================================================
     *
     * Solo la ID configurada en VERIFIED_ADMIN_ID
     * puede ejecutar /verified.
     */

    if (interaction.user.id !== VERIFIED_ADMIN_ID) {
      const message = getNoAdminMessage(interaction.locale);

      return await interaction.reply({
        content: message,
        ephemeral: true
      });
    }


    /**
     * =================================================
     * DEFER REPLY
     * =================================================
     */

    await interaction.deferReply({ flags: 64 });


    /**
     * =================================================
     * OPTIONS
     * =================================================
     */

    const page =
      interaction.options.getInteger('page') || 1;

    const refresh =
      interaction.options.getBoolean('refresh') || false;

    const pageSize = 10;

    const offset =
      (page - 1) * pageSize;


    /**
     * =================================================
     * GET TOTAL COUNT
     * =================================================
     */

    const countResult =
      await query(
        'SELECT COUNT(*) as total FROM verified_users'
      );

    const totalUsers =
      parseInt(
        countResult.rows[0]?.total || 0
      );

    const totalPages =
      Math.ceil(totalUsers / pageSize);


    /**
     * =================================================
     * NO VERIFIED USERS
     * =================================================
     */

    if (totalUsers === 0) {

      return interaction.editReply({
        content:
          `${EMOJIS.INFO} No verified users at the moment.\n\n` +
          '**Verification link:**\n' +
          `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
          `&response_type=code` +
          `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}` +
          `&scope=identify+guilds.join`
      });

    }


    /**
     * =================================================
     * GET USERS
     * =================================================
     */

    const result =
      await query(
        `SELECT
          user_id,
          username,
          discriminator,
          avatar,
          verified_at,
          scope
        FROM verified_users
        ORDER BY verified_at DESC
        LIMIT $1 OFFSET $2`,
        [
          pageSize,
          offset
        ]
      );


    /**
     * =================================================
     * REFRESH ROLES
     * =================================================
     */

    let refreshedCount = 0;

    if (refresh) {

      const roleId =
        process.env.VERIFIED_ROLE_ID;

      if (roleId) {

        for (const user of result.rows) {

          try {

            const member =
              await interaction.guild.members.fetch(
                user.user_id
              );

            if (
              member &&
              !member.roles.cache.has(roleId)
            ) {

              await member.roles.add(roleId);

              refreshedCount++;

            }

          } catch (error) {

            // User not in guild

          }

        }

      }

    }


    /**
     * =================================================
     * BUILD USER LIST
     * =================================================
     */

    let userList = '';

    for (
      let i = 0;
      i < result.rows.length;
      i++
    ) {

      const user =
        result.rows[i];

      const num =
        offset + i + 1;

      const verifiedDate =
        new Date(
          user.verified_at
        ).toLocaleDateString('fr-FR');


      userList +=
        `**${num}.** ${user.username}#${user.discriminator}\n`;

      userList +=
        `   └ ID: \`${user.user_id}\` | Verified: ${verifiedDate}\n\n`;

    }


    /**
     * =================================================
     * EMBED
     * =================================================
     */

    const embed =
      new EmbedBuilder()

        .setTitle(
          '👥 Verified Users'
        )

        .setDescription(
          `**Total: ${totalUsers} users**\n` +
          `Page ${page}/${totalPages}\n\n` +
          userList +
          (
            refresh
              ? `\n✅ ${refreshedCount} roles refreshed`
              : ''
          )
        )

        .setColor(
          COLORS.SUCCESS
        )

        .setImage(
          PANEL_BANNER_URL
        )

        .setFooter({
          text:
            `PrimeGen - OAuth2 Verification System • Page ${page}/${totalPages}`,

          iconURL:
            'https://i.goopics.net/2eukvn.gif'
        })

        .setTimestamp();


    /**
     * =================================================
     * VERIFICATION LINK
     * =================================================
     */

    embed.addFields({
      name: '🔗 Verification Link',

      value:
        `[Click here to verify yourself](` +
        `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}` +
        `&scope=identify+guilds.join)`,

      inline: false
    });


    /**
     * =================================================
     * SEND RESULT
     * =================================================
     */

    await interaction.editReply({
      embeds: [embed]
    });


    /**
     * =================================================
     * LOG
     * =================================================
     */

    logger.info(
      'Verified',
      'Listed verified users',
      {
        page,
        totalUsers,
        refreshed: refreshedCount,
        user: interaction.user.tag,
        userId: interaction.user.id
      }
    );


  } catch (error) {

    /**
     * =================================================
     * ERROR
     * =================================================
     */

    logger.error(
      'Verified',
      'Command failed',
      {
        error: error.message
      }
    );


    const reply = {
      content:
        `${EMOJIS.ERROR} Error: ${error.message}`
    };


    if (interaction.deferred) {

      await interaction.editReply(
        reply
      );

    } else {

      await interaction.reply({
        ...reply,
        flags: 64
      });

    }

  }
}


/**
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  command,
  execute
};
