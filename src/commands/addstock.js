/**
 * =====================================================
 * ADDSTOCK COMMAND - THE ULTIMATE STOCK MANAGER
 * =====================================================
 * Manage stock across all tiers (Free, Premium, Prime)
 * Supports single strings, text files (TXT/ULP), and GoFile.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');
const { getAllServices, getServiceById } = require('../config/services');
const { getOrFetchEmoji } = require('../services/emojiManager');
const fs = require('fs');
const path = require('path');
const https = require('https');

const logger = getLogger();

/**
 * =====================================================
 * ADDSTOCK ADMIN
 * =====================================================
 *
 * PON AQUÍ EL ID DE DISCORD DE LA ÚNICA PERSONA
 * QUE PODRÁ USAR /addstock.
 *
 * Ejemplo:
 * const ADDSTOCK_ADMIN_ID = '123456789012345678';
 */
const ADDSTOCK_ADMIN_ID = '1178305844698435625';


/**
 * =====================================================
 * TRANSLATIONS
 * =====================================================
 */

function getNoAdminMessage(locale) {
  const messages = {
    'es-ES': '🚫 No Puedes Añadir Stock Si No Eres Admin',
    'es-419': '🚫 No Puedes Añadir Stock Si No Eres Admin',

    'en-US': '🚫 You Cannot Add Stock If You Are Not An Admin',
    'en-GB': '🚫 You Cannot Add Stock If You Are Not An Admin',

    'fr': '🚫 Vous ne pouvez pas ajouter de stock si vous n’êtes pas administrateur',

    'de': '🚫 Du kannst keinen Bestand hinzufügen, wenn du kein Administrator bist',

    'it': '🚫 Non puoi aggiungere stock se non sei un amministratore',

    'pt-BR': '🚫 Você não pode adicionar estoque se não for administrador',
    'pt-PT': '🚫 Não podes adicionar stock se não fores administrador',

    'nl': '🚫 Je kunt geen voorraad toevoegen als je geen beheerder bent',

    'pl': '🚫 Nie możesz dodawać zapasów, jeśli nie jesteś administratorem',

    'ru': '🚫 Вы не можете добавлять запасы, если вы не администратор',

    'tr': '🚫 Yönetici değilseniz stok ekleyemezsiniz',

    'ja': '🚫 管理者でない場合、在庫を追加することはできません',

    'ko': '🚫 관리자만 재고를 추가할 수 있습니다',

    'zh-CN': '🚫 不是管理员不能添加库存',
    'zh-TW': '🚫 不是管理員不能新增庫存',

    'ar': '🚫 لا يمكنك إضافة المخزون إذا لم تكن مسؤولاً'
  };

  return messages[locale] || messages['en-US'];
}


/**
 * =====================================================
 * COMMAND
 * =====================================================
 */

const command = new SlashCommandBuilder()
  .setName('addstock')
  .setDescription('📦 Ultimate command to restock any service (Files, GoFile, or Text)')
  .setDefaultMemberPermissions('8')

  .addStringOption(option =>
    option
      .setName('service')
      .setDescription('Service to restock (shows current stock)')
      .setRequired(true)
      .setAutocomplete(true)
  )

  .addAttachmentOption(option =>
    option
      .setName('fichier')
      .setDescription('Upload a TXT or ULP file containing combos')
      .setRequired(false)
  )

  .addStringOption(option =>
    option
      .setName('comptes')
      .setDescription('Or paste accounts directly (format: email:pass, comma-separated)')
      .setRequired(false)
  )

  .addStringOption(option =>
    option
      .setName('gofile_url')
      .setDescription('Or paste a GoFile URL for massive files')
      .setRequired(false)
  );


/**
 * =====================================================
 * EXECUTE
 * =====================================================
 */

async function execute(interaction) {
  let tempFile = null;

  try {

    /**
     * =================================================
     * SECURITY CHECK
     * =================================================
     *
     * Solo el Discord ID configurado arriba puede
     * ejecutar /addstock.
     */

    if (interaction.user.id !== ADDSTOCK_ADMIN_ID) {
      const message = getNoAdminMessage(interaction.locale);

      return await interaction.reply({
        content: message,
        ephemeral: true
      });
    }


    await interaction.deferReply({ flags: 64 });


    const serviceId = interaction.options
      .getString('service')
      .toLowerCase();

    const attachment = interaction.options.getAttachment('fichier');

    const accountsInput = interaction.options.getString('comptes');

    const gofileUrl = interaction.options.getString('gofile_url');


    /**
     * =================================================
     * VALIDATE SERVICE
     * =================================================
     */

    const service = getServiceById(serviceId);

    if (!service) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Service **${serviceId}** introuvable!`
      });
    }


    /**
     * =================================================
     * VALIDATE SOURCE
     * =================================================
     */

    if (!attachment && !accountsInput && !gofileUrl) {
      return interaction.editReply({
        content:
          `${EMOJIS.ERROR} Tu dois fournir au moins une source : ` +
          '`fichier`, `comptes` ou `gofile_url` !'
      });
    }


    const qualityScore = service.tier === 'prime' ? 100 : 50;


    /**
     * =================================================
     * GOFILE RESTOCK
     * =================================================
     */

    if (gofileUrl) {
      return await handleGofileRestock(
        interaction,
        serviceId,
        service,
        gofileUrl,
        qualityScore
      );
    }


    let combos = [];


    /**
     * =================================================
     * INLINE ACCOUNTS
     * =================================================
     */

    if (accountsInput) {
      const parsed = accountsInput
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

      combos.push(...parsed);
    }


    /**
     * =================================================
     * FILE ATTACHMENT
     * =================================================
     */

    if (attachment) {

      const fileName = attachment.name.toLowerCase();

      if (
        !fileName.endsWith('.txt') &&
        !fileName.endsWith('.ulp')
      ) {
        return interaction.editReply({
          content:
            `${EMOJIS.ERROR} Format de fichier invalide! ` +
            `Utilise .txt ou .ulp`
        });
      }


      if (attachment.size > 10 * 1024 * 1024) {
        return interaction.editReply({
          content:
            `${EMOJIS.ERROR} Le fichier est trop volumineux ` +
            `(Max 10MB). Utilise GoFile pour les gros fichiers.`
        });
      }


      const tempDir = path.join(process.cwd(), 'temp');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }


      tempFile = path.join(
        tempDir,
        `restock_${Date.now()}_${attachment.name}`
      );


      await downloadFile(
        attachment.url,
        tempFile
      );


      await interaction.editReply({
        content:
          `${EMOJIS.INFO} Fichier téléchargé, extraction des combos...`
      });


      const fileCombos = await parseComboFile(tempFile);

      combos.push(...fileCombos);


      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      tempFile = null;
    }


    /**
     * =================================================
     * VALIDATE COMBOS
     * =================================================
     */

    if (combos.length === 0) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Aucun combo valide trouvé!`
      });
    }


    /**
     * =================================================
     * REMOVE DUPLICATES
     * =================================================
     */

    combos = [...new Set(combos)];


    /**
     * =================================================
     * INSERT INTO DATABASE
     * =================================================
     */

    let added = 0;

    const batchSize = 1000;


    for (let i = 0; i < combos.length; i += batchSize) {

      const batch = combos.slice(
        i,
        i + batchSize
      );


      for (const combo of batch) {

        try {

          const email = combo.includes(':')
            ? combo.split(':')[0]
            : combo;


          const res = await query(
            `INSERT INTO combos
            (service_id, combo, email, quality_score)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (combo) DO NOTHING`,
            [
              serviceId,
              combo,
              email,
              qualityScore
            ]
          );


          if (res && res.rowCount > 0) {
            added++;
          }

        } catch (error) {

          try {

            await query(
              `INSERT INTO combos
              (service_id, combo, email, quality_score)
              VALUES ($1, $2, $3, $4)`,
              [
                serviceId,
                combo,
                combo,
                qualityScore
              ]
            );

            added++;

          } catch (e) {

            if (
              !e.message.includes('UNIQUE constraint') &&
              !e.message.includes('duplicate key')
            ) {

              logger.warn(
                'AddStock',
                `Insert error: ${e.message}`
              );

            }
          }
        }
      }


      /**
       * =================================================
       * PROGRESS
       * =================================================
       */

      const progress = Math.min(
        100,
        Math.round(
          ((i + batch.length) / combos.length) * 100
        )
      );


      if (combos.length > batchSize) {

        await interaction.editReply({
          content:
            `${EMOJIS.INFO} Ajout des comptes...\n` +
            `📊 Progression: ${progress}%\n` +
            `✅ Importés: ${added.toLocaleString()}`
        });
      }
    }


    /**
     * =================================================
     * FINAL STOCK
     * =================================================
     */

    const stockResult = await query(
      `SELECT COUNT(*) as count
       FROM combos
       WHERE service_id = $1`,
      [serviceId]
    );


    const totalStock =
      parseInt(stockResult.rows[0]?.count, 10) || added;


    const serviceEmoji =
      await getOrFetchEmoji(
        interaction.guild,
        service
      );


    /**
     * =================================================
     * SUCCESS EMBED
     * =================================================
     */

    const embed = new EmbedBuilder()

      .setTitle(
        '📦 PrimeGen - Restock Effectué'
      )

      .setDescription(
        '**Service**\n' +
        `${serviceEmoji} ${service.label}\n\n` +

        '**Résultats**\n' +
        `✅ Importés: \`${added.toLocaleString()}\`\n\n` +

        '**Stock Total**\n' +
        `📦 \`${totalStock.toLocaleString()}\` comptes disponibles`
      )

      .setColor(
        service.tier === 'prime'
          ? '#FFD700'
          : COLORS.SUCCESS
      )

      .setImage(PANEL_BANNER_URL)

      .setFooter({
        text: 'PrimeGen - Stock Manager',
        iconURL:
          'https://i.goopics.net/2eukvn.gif'
      })

      .setTimestamp();


    await interaction.editReply({
      content: '',
      embeds: [embed]
    });


    /**
     * =================================================
     * LOG
     * =================================================
     */

    logger.info(
      'AddStock',
      `Restock completed for ${serviceId}`,
      {
        service: serviceId,
        added,
        totalStock,
        user: interaction.user.tag
      }
    );


  } catch (error) {

    /**
     * =================================================
     * CLEAN TEMP FILE
     * =================================================
     */

    if (
      tempFile &&
      fs.existsSync(tempFile)
    ) {
      fs.unlinkSync(tempFile);
    }


    logger.error(
      'AddStock',
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

      await interaction.editReply(reply);

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
 * HANDLE GOFILE RESTOCK
 * =====================================================
 */

async function handleGofileRestock(
  interaction,
  serviceId,
  service,
  gofileUrl,
  qualityScore
) {

  await interaction.editReply({
    content:
      `${EMOJIS.INFO} **GoFile processing in progress...**\n` +
      `🔗 URL: ${gofileUrl}\n` +
      `${EMOJIS.WARNING} This can take several minutes for large files!`
  });


  try {

    const { processGofileUlp } =
      require('../../gofile_ulp');

    const { getAllServices } =
      require('../config/services');

    const services =
      getAllServices();


    let totalAdded = 0;

    let currentFile = '';

    let currentProgress = 0;


    const result =
      await processGofileUlp({

        gofileUrl,

        services:
          services.map(s => s.id),

        addCombosFn:
          async (combos) => {

            for (const combo of combos) {

              try {

                await query(
                  `INSERT INTO combos
                  (service_id, combo, quality_score, email)
                  VALUES ($1, $2, $3, $4)`,
                  [
                    serviceId,
                    combo.combo,
                    qualityScore,
                    combo.combo.split(':')[0] ||
                      combo.combo
                  ]
                );

                totalAdded++;

              } catch (error) {
                // Ignore duplicates
              }
            }

            return combos.length;
          },


        onEvent:
          async (event) => {

            if (event.type === 'download-start') {

              currentFile =
                event.fileName;


              await interaction
                .editReply({
                  content:
                    `${EMOJIS.INFO} **Downloading...**\n` +
                    `📄 File: ${event.fileName}\n` +
                    `📊 Size: ${(event.totalBytes / 1024 / 1024).toFixed(2)} MB`
                })
                .catch(() => {});


            } else if (
              event.type === 'parse-file-progress'
            ) {

              currentProgress =
                event.fileLinesProcessed;


              if (
                currentProgress % 10000 === 0
              ) {

                await interaction
                  .editReply({
                    content:
                      `${EMOJIS.INFO} **Analysis in progress...**\n` +
                      `📄 File: ${currentFile}\n` +
                      `📊 Lines: ${currentProgress}\n` +
                      `✅ Valid: ${event.fileValidFound}\n` +
                      `📦 Total added: ${totalAdded}`
                  })
                  .catch(() => {});
              }
            }
          }
      });


    /**
     * =================================================
     * FINAL STOCK
     * =================================================
     */

    const stockResult = await query(
      `SELECT COUNT(*) as count
       FROM combos
       WHERE service_id = $1`,
      [serviceId]
    );


    const totalStock =
      parseInt(stockResult.rows[0]?.count, 10) ||
      totalAdded;


    const serviceEmoji =
      await getOrFetchEmoji(
        interaction.guild,
        service
      );


    /**
     * =================================================
     * SUCCESS EMBED
     * =================================================
     */

    const embed = new EmbedBuilder()

      .setTitle(
        `${EMOJIS.SUCCESS} GoFile Restock Complete - ${service.label}`
      )

      .setDescription(
        `🔗 **Source:** GoFile\n` +
        `📦 **Service:** ${serviceEmoji} ${service.label}\n\n` +
        `✅ **Comptes ajoutés:** ${totalAdded.toLocaleString()}\n` +
        `📊 **Score de qualité:** ${qualityScore}/100\n\n` +
        `${EMOJIS.STOCK} **Stock Total:** ${totalStock.toLocaleString()} comptes`
      )

      .setColor(
        service.tier === 'prime'
          ? '#FFD700'
          : COLORS.SUCCESS
      )

      .setFooter({
        text: 'PrimeGen GoFile Restock System',
        iconURL:
          'https://i.goopics.net/2eukvn.gif'
      })

      .setTimestamp();


    await interaction.editReply({
      content: '',
      embeds: [embed]
    });


  } catch (error) {

    logger.error(
      'Restock',
      'GoFile restock failed',
      {
        error: error.message
      }
    );

    throw error;
  }
}


/**
 * =====================================================
 * DOWNLOAD FILE
 * =====================================================
 */

function downloadFile(url, dest) {

  return new Promise((resolve, reject) => {

    const file =
      fs.createWriteStream(dest);


    https.get(
      url,
      (response) => {

        response.pipe(file);


        file.on(
          'finish',
          () => {

            file.close(resolve);

          }
        );

      }
    ).on(
      'error',
      (err) => {

        fs.unlink(
          dest,
          () => {}
        );

        reject(err);

      }
    );
  });
}


/**
 * =====================================================
 * PARSE COMBO FILE
 * =====================================================
 */

async function parseComboFile(filePath) {

  const content =
    fs.readFileSync(
      filePath,
      'utf-8'
    );


  const lines =
    content.split(/\r?\n/);


  const combos = [];


  for (const line of lines) {

    const trimmed =
      line.trim();


    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('//')
    ) {
      continue;
    }


    const colonIndex =
      trimmed.indexOf(':');


    if (
      colonIndex > 0 &&
      colonIndex < trimmed.length - 1
    ) {

      combos.push(trimmed);

    }
  }


  return combos;
}


/**
 * =====================================================
 * AUTOCOMPLETE
 * =====================================================
 */

async function autocomplete(interaction) {

  const focusedValue =
    interaction.options
      .getFocused()
      .toLowerCase();


  const allServices =
    getAllServices();


  let stockMap = {};


  try {

    const result =
      await query(
        `SELECT service_id, COUNT(*) as count
         FROM combos
         GROUP BY service_id`
      );


    for (const row of result.rows) {

      stockMap[row.service_id] =
        parseInt(row.count, 10);

    }

  } catch (e) {
    // Ignore autocomplete database errors
  }


  const choices =
    allServices

      .filter(
        service =>
          service.id.includes(focusedValue) ||
          service.label
            .toLowerCase()
            .includes(focusedValue)
      )

      .slice(0, 25)

      .map(service => {

        const stock =
          stockMap[service.id] || 0;


        const prefix =
          service.tier === 'prime'
            ? '💎 '
            : '';


        return {
          name:
            `${prefix}${service.label} (Stock: ${stock})`
              .substring(0, 100),

          value:
            service.id
        };

      });


  await interaction.respond(
    choices
  );
}


/**
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  command,
  execute,
  autocomplete
};
