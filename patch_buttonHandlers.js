const fs = require('fs');
const file = 'src/handlers/buttonHandlers.js';
let content = fs.readFileSync(file, 'utf8');

// Replace Premium error
content = content.replace(/🖕 Va te faire foutre, t'as pas le rôle Premium ! Achète-le sur le shop avant de cliquer ici\./g, "❌ You do not have the Premium role! Purchase it in the shop before clicking here.");

// Replace Success DM sent
content = content.replace(/envoyé en DM !\\n\$\{EMOJIS\.INFO\} Veuillez vérifier vos messages privés et choisir votre langue\./g, 'sent to your DMs!\\n${EMOJIS.INFO} Please check your private messages.');

// Replace Error DM
content = content.replace(/Impossible de vous envoyer un MP !\\n\$\{EMOJIS\.INFO\} Vérifiez que vos messages privés sont bien ouverts\./g, 'Could not send you a DM!\\n${EMOJIS.INFO} Please check that your direct messages are open.');

// Replace Proof Ping
content = content.replace(/Hey \$\{user\} ! 🎁 N'oublie pas de laisser ton avis \/ proof dans <#\$\{REVIEW_CHANNEL_ID\}> sous \*\*24h\*\* pour ta génération de \*\*\$\{service\.label\}\*\* !\\n⚠️ \*\*Si tu ne le fais pas dans les 24h, tu recevras un avertissement\.\*\*/g, "Hey ${user}! 🎁 Don't forget to leave your review / proof in <#${REVIEW_CHANNEL_ID}> within **24h** for your generation of **${service.label}**!\\n⚠️ **If you don't do it within 24h, you will receive a warning.**");

// Remove languageRow from handleGenButton
content = content.replace(/const dmEmbed = buildFrenchGenEmbed\(.*?\);[\s\S]*?await interaction\.user\.send\(\{ embeds: \[dmEmbed\], components: \[languageRow\] \}\);/m, 
`const dmEmbed = buildEnglishGenEmbed(service.label, account.combo, account.account_info, remainingStock);
    await interaction.user.send({ embeds: [dmEmbed] });`);

// Remove handleLanguageSwitch from the main if block
content = content.replace(/else if \(customId === 'lang_fr' \|\| customId === 'lang_en'\) \{\s*await handleLanguageSwitch\(interaction\);\s*\}/g, '');

fs.writeFileSync(file, content);
