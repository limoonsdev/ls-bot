const { getLogger } = require('../utils/logger');
const logger = getLogger();

const REQUIRED_TAGS = ['.gg/shop2rv', '.gg/dreamshop', 'shop2rv', 'dreamshop'];
const ROLE_ID = '1532347064623698010';

async function handlePresenceUpdate(oldPresence, newPresence) {
  if (!newPresence || !newPresence.member) return;
  const member = newPresence.member;
  if (member.user.bot) return;

  const checkTag = (str) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return REQUIRED_TAGS.some(tag => lower.includes(tag.toLowerCase()));
  };

  const hasTagInName = checkTag(member.user.username) || 
                       checkTag(member.nickname) || 
                       checkTag(member.user.displayName);
  
  const activities = newPresence.activities || [];
  const hasTagInStatus = activities.some(activity => 
    activity.type === 4 && checkTag(activity.state) // 4 is Custom Status
  );

  const hasTag = hasTagInName || hasTagInStatus;
  const hasRole = member.roles.cache.has(ROLE_ID);

  try {
    if (hasTag && !hasRole) {
      await member.roles.add(ROLE_ID);
      logger.info('Presence', `Added Free role to ${member.user.tag} (has vanity status .gg/shop2rv)`);
    } else if (!hasTag && hasRole) {
      await member.roles.remove(ROLE_ID);
      logger.info('Presence', `Removed Free role from ${member.user.tag} (missing vanity status)`);
    }
  } catch (error) {
    logger.error('Presence', `Failed to update status role for ${member.user.tag}`, { error: error.message });
  }
}

module.exports = {
  handlePresenceUpdate,
  REQUIRED_TAGS
};
