/**
 * =====================================================
 * SERVICE CATALOG - DREAMSHOP ULTRA EDITION
 * =====================================================
 * Curated list of high-quality services (Max 24 for 1 single panel)
 * perfectly categorized with custom emojis and tier assignments.
 */

const { ButtonStyle } = require('discord.js');

/**
 * Complete curated service catalog (24 regular services + 2 prime services)
 */
const SERVICES = [
  // =====================================================
  // 💎 PRIME EXCLUSIVE SERVICES (Staff / VIP Restock)
  // =====================================================
  { 
    id: 'fortnite_prime', 
    label: 'Fortnite [Prime HQ]', 
    emojiName: 'ng_fortnite', 
    defaultEmoji: '👑🎮', 
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png', 
    style: ButtonStyle.Success, 
    tier: 'prime',
    category: 'prime'
  },
  { 
    id: 'valorant_prime', 
    label: 'Valorant [Prime HQ]', 
    emojiName: 'ng_valorant', 
    defaultEmoji: '👑🎯', 
    iconUrl: 'https://img.icons8.com/color/512/valorant.png', 
    style: ButtonStyle.Success, 
    tier: 'prime',
    category: 'prime'
  },

  // =====================================================
  // 🎬 STREAMING (6 Services)
  // =====================================================
  { id: 'netflix', label: 'Netflix', emojiName: 'ng_netflix', defaultEmoji: '🍿', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Netflix_2015_N_logo.svg/512px-Netflix_2015_N_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'streaming' },
  { id: 'disney', label: 'Disney+', emojiName: 'ng_disney', defaultEmoji: '🏰', iconUrl: 'https://store-images.s3.amazonaws.com/image/apps.14187.14495311847124170.7646206e-bd82-4cf0-8b8c-d06a67bc302c.2e474878-acb7-4afb-a503-c2a1a32feaa8?h=210', style: ButtonStyle.Secondary, tier: 'premium', category: 'streaming' },
  { id: 'paramount', label: 'Paramount+', emojiName: 'ng_paramount', defaultEmoji: '🎬', iconUrl: 'https://play-lh.googleusercontent.com/O5QHZxy2pkxwHrjU3Omd_1jdIYk_pZQexy2VVEDBDhaXgNhvZV7wjhfN_0kLUrQfCKFsaGbQbVm8usyrc-yBGhI', style: ButtonStyle.Secondary, tier: 'premium', category: 'streaming' },
  { id: 'primevideo', label: 'Prime Video', emojiName: 'ng_primevideo', defaultEmoji: '📺', iconUrl: 'https://img.icons8.com/color/512/amazon-prime-video.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'streaming' },
  { id: 'hbomax', label: 'HBO Max', emojiName: 'ng_hbomax', defaultEmoji: '🟣', iconUrl: 'https://img.icons8.com/color/512/hbo.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'streaming' },
  { id: 'crunchyroll', label: 'Crunchyroll', emojiName: 'ng_crunchyroll', defaultEmoji: '🍥', iconUrl: 'https://img.icons8.com/color/512/crunchyroll.png', style: ButtonStyle.Secondary, tier: 'free', category: 'streaming' },

  // =====================================================
  // 🎮 GAMING (9 Services)
  // =====================================================
  { id: 'fortnite', label: 'Fortnite', emojiName: 'ng_fortnite', defaultEmoji: '🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png', style: ButtonStyle.Secondary, tier: 'free', category: 'gaming' },
  { id: 'valorant', label: 'Valorant', emojiName: 'ng_valorant', defaultEmoji: '🎯', iconUrl: 'https://img.icons8.com/color/512/valorant.png', style: ButtonStyle.Secondary, tier: 'free', category: 'gaming' },
  { id: 'minecraft', label: 'Minecraft', emojiName: 'ng_minecraft', defaultEmoji: '⛏️', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5969/5969244.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'gaming' },
  { id: 'rockstar', label: 'Rockstar Games', emojiName: 'ng_rockstar', defaultEmoji: '⭐', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968853.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'gaming' },
  { id: 'steam', label: 'Steam', emojiName: 'ng_steam', defaultEmoji: '🎲', iconUrl: 'https://img.icons8.com/color/512/steam.png', style: ButtonStyle.Secondary, tier: 'free', category: 'gaming' },
  { id: 'roblox', label: 'Roblox', emojiName: 'ng_roblox', defaultEmoji: '🧱', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Roblox_player_icon_black.svg/512px-Roblox_player_icon_black.svg.png', style: ButtonStyle.Secondary, tier: 'free', category: 'gaming' },
  { id: 'epicgames', label: 'Epic Games', emojiName: 'ng_epicgames', defaultEmoji: '🕹️', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/512px-Epic_Games_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'gaming' },
  { id: 'battlenet', label: 'Battle.net', emojiName: 'ng_battlenet', defaultEmoji: '⚔️', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Battle.net_Logo.svg/512px-Battle.net_Logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'gaming' },
  { id: 'psn', label: 'PlayStation Network', emojiName: 'ng_psn', defaultEmoji: '🟦', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968875.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'gaming' },

  // =====================================================
  // 🛡️ VPN (3 Services)
  // =====================================================
  { id: 'nordvpn', label: 'NordVPN', emojiName: 'ng_nordvpn', defaultEmoji: '🛡️', iconUrl: 'https://img.icons8.com/color/512/nordvpn.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'vpn' },
  { id: 'expressvpn', label: 'ExpressVPN', emojiName: 'ng_expressvpn', defaultEmoji: '🚀', iconUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-expressvpn-3442898-2875376.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'vpn' },
  { id: 'mullvadvpn', label: 'MullvadVPN', emojiName: 'ng_mullvadvpn', defaultEmoji: '🔒', iconUrl: 'https://mullvad.net/press/MullvadVPN_logo_Round_RGB_Color_negative.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'vpn' },

  // =====================================================
  // 🎵 MUSIC (2 Services)
  // =====================================================
  { id: 'spotify', label: 'Spotify', emojiName: 'ng_spotify', defaultEmoji: '🎵', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/512px-Spotify_icon.svg.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'music' },
  { id: 'deezer', label: 'Deezer', emojiName: 'ng_deezer', defaultEmoji: '🎧', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968841.png', style: ButtonStyle.Secondary, tier: 'free', category: 'music' },

  // =====================================================
  // 🤖 DISCORD, AI & SOCIAL (4 Services)
  // =====================================================
  { id: 'discord', label: 'Discord', emojiName: 'ng_discord', defaultEmoji: '💬', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5969/5969038.png', style: ButtonStyle.Secondary, tier: 'free', category: 'social' },
  { id: 'tiktok', label: 'TikTok', emojiName: 'ng_tiktok', defaultEmoji: '📱', iconUrl: 'https://img.icons8.com/color/512/tiktok.png', style: ButtonStyle.Secondary, tier: 'free', category: 'social' },
  { id: 'elevenlabs', label: 'ElevenLabs AI', emojiName: 'ng_elevenlabs', defaultEmoji: '🎙️', iconUrl: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/sound-wave-3351989-2810811.png', style: ButtonStyle.Secondary, tier: 'premium', category: 'social' },
  { id: 'duolingo', label: 'Duolingo Plus', emojiName: 'ng_duolingo', defaultEmoji: '🦉', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Duolingo_logo.svg/512px-Duolingo_logo.svg.png', style: ButtonStyle.Secondary, tier: 'free', category: 'social' }
];

/**
 * Get service by ID
 */
function getServiceById(serviceId) {
  return SERVICES.find(s => s.id === serviceId) || null;
}

/**
 * Get services by tier
 */
function getServicesByTier(tier) {
  return SERVICES.filter(s => s.tier === tier);
}

/**
 * Get all services
 */
function getAllServices() {
  return SERVICES;
}

/**
 * Get service count
 */
function getServiceCount() {
  return SERVICES.length;
}

/**
 * Check if service exists
 */
function serviceExists(serviceId) {
  return SERVICES.some(s => s.id === serviceId);
}

module.exports = {
  SERVICES,
  getServiceById,
  getServicesByTier,
  getAllServices,
  getServiceCount,
  serviceExists
};
