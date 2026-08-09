const { getLogger } = require('../utils/logger');
const logger = getLogger();

const GROQ_API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY';

const AI_PROMPT = `Tu es PrimeBot, l'Intelligence Artificielle Ultime de PrimeGen.
Tu agis comme l'assistant de support de premier niveau dans les tickets.

# Contexte du Serveur (PrimeGen)
PrimeGen est un des plus gros fournisseurs de comptes, outils et services digitaux sur Discord.
- Nous proposons des panels de Génération de comptes : Free, Premium, et VIP (Prime).
- Le statut "Free" s'obtient en mettant ".gg/primegen" dans son statut personnalisé Discord.
- Les rôles "Premium" et "VIP" s'achètent via des tickets.
- Nous avons un Panel Shop automatisé (avec intégration PayPal) et un système d'avis (Proofs).
- Nouveauté : Le "PrimeTools Panel" qui permet aux VIP d'avoir accès à des générateurs d'identité, Fake CC, Temp Mail, Proxys HTTP, UUID et 2FA.

# Ton Rôle dans les Tickets
Tu es là pour répondre aux questions des utilisateurs, les rassurer, et leur donner des instructions claires s'ils veulent acheter quelque chose ou ont un problème technique.
Tu dois :
- Être chaleureux, professionnel, rapide et extrêmement précis.
- Parler en français ou dans la langue de l'utilisateur s'il parle anglais.
- Tu connais tout sur le bot.

# Protocole d'Escalade (Ping Staff)
Si l'utilisateur a un problème de paiement, un problème complexe avec un compte, ou réclame un remboursement, TU DOIS PINGER LE STAFF POUR QU'ILS PRENNENT LE RELAIS.
Pour pinger le staff, inclus EXACTEMENT ceci dans ton message final (au choix selon la gravité) :
- Pinger les Helpers (pour de l'aide générale) : <@&1532347155254087720>
- Pinger les Modérateurs (pour un paiement ou litige) : <@&1532347198975639582>

# RÈGLES STRICTES
- Reste toujours dans le cadre de PrimeGen. Si l'utilisateur parle d'autre chose, ramène le sujet sur PrimeGen ou dis-lui que tu es là uniquement pour le support.
- Ne ping JAMAIS @everyone ou @here.
- Formate tes messages proprement avec du Markdown.`;

const userCooldowns = new Map();
const userLastMessage = new Map();

async function handleMessageCreate(message) {
  // Ignore bots, system messages, or @everyone / @here pings
  if (message.author.bot || message.mentions.everyone) return;

  // ONLY allow the AI to reply inside tickets (channels starting with ticket- or order-)
  if (!message.channel.name.startsWith('ticket-') && !message.channel.name.startsWith('order-')) {
    return;
  }

  // Only reply if the bot is directly mentioned
  if (message.mentions.has(message.client.user)) {
    
    // Anti-spam cooldown (5 seconds per user)
    const now = Date.now();
    if (userCooldowns.has(message.author.id)) {
      const lastTime = userCooldowns.get(message.author.id);
      if (now - lastTime < 5000) return; 
    }
    userCooldowns.set(message.author.id, now);

    try {
      const userText = message.content.replace(`<@${message.client.user.id}>`, '').trim();

      // Ignore if empty text
      if (!userText || userText.length < 2) return;

      // Duplicate check (Spam/Mute)
      const lastMsg = userLastMessage.get(message.author.id);
      if (lastMsg && lastMsg.toLowerCase() === userText.toLowerCase()) {
        try {
          if (message.member) {
            await message.member.timeout(10000, "Spam dans le ticket");
            await message.reply("🤫 Mute 10s. Arrête de spammer la même chose.");
          }
        } catch (e) {
           logger.error('MessageHandlers', 'Failed to timeout member', { error: e.message });
        }
        return; 
      }
      userLastMessage.set(message.author.id, userText);

      await message.channel.sendTyping();

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: AI_PROMPT },
            { role: 'user', content: userText }
          ],
          max_tokens: 300,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      await message.reply(reply);
    } catch (error) {
      logger.error('MessageHandlers', 'AI response failed', { error: error.message });
      // On spam/error silently drop to avoid spamming the chat
    }
  }
}

module.exports = {
  handleMessageCreate
};
