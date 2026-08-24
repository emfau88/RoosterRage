const PROFILES = {
  physical: {
    id: 'physical', color: 0xfff1bf, flash: 0xffffff, text: '#fff2c7', death: 'pop'
  },
  fire: {
    id: 'fire', color: 0xff7a2f, flash: 0xffd08a, text: '#ffb36c', death: 'burn'
  },
  lightning: {
    id: 'lightning', color: 0x6fe7ff, flash: 0xd8fbff, text: '#8feeff', death: 'shock'
  },
  void: {
    id: 'void', color: 0xa46cff, flash: 0xe0c7ff, text: '#cfadff', death: 'collapse'
  },
  explosive: {
    id: 'explosive', color: 0xffb12f, flash: 0xffedba, text: '#ffd16f', death: 'blast'
  },
  laser: {
    id: 'laser', color: 0xff7759, flash: 0xfff4c9, text: '#ffb095', death: 'sear'
  },
  support: {
    id: 'support', color: 0x9ce98d, flash: 0xe5ffdc, text: '#baf5aa', death: 'pop'
  }
};

export function getCombatFeedbackProfile(source = 'base-egg') {
  const normalized = String(source).toLowerCase();
  if (/void|singularit/.test(normalized)) return PROFILES.void;
  if (/lightning|thunder|storm|tempest/.test(normalized)) return PROFILES.lightning;
  if (/rocket|broodstorm|blast|siegebreaker|artillery|bomb/.test(normalized)) return PROFILES.explosive;
  if (/laser|dawn/.test(normalized)) return PROFILES.laser;
  if (/molotov|phoenix|fire-eggs|solar/.test(normalized)) return PROFILES.fire;
  if (/support-chick|chick-squadron/.test(normalized)) return PROFILES.support;
  return PROFILES.physical;
}

export function getMultiKillTier(count) {
  if (count >= 15) return { threshold: 15, label: 'ROOSTER RAMPAGE', scale: 1.18 };
  if (count >= 8) return { threshold: 8, label: 'FLOCK BREAKER', scale: 1.08 };
  if (count >= 4) return { threshold: 4, label: 'KILL CHAIN', scale: 1 };
  return null;
}
