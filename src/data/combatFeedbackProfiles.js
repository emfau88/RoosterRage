const PROFILES = {
  physical: {
    id: 'physical', color: 0xfff1bf, flash: 0xffffff, text: '#fff2c7', death: 'pop',
    deathFx: {
      colors: [0xffffff, 0xffedb3, 0xd89a52],
      shape: 'feather', speed: 142, spread: 3.4, gravity: 230
    }
  },
  fire: {
    id: 'fire', color: 0xff7a2f, flash: 0xffd08a, text: '#ffb36c', death: 'burn',
    deathFx: {
      colors: [0xfff0a3, 0xff9d32, 0xe73d24],
      shape: 'ember', speed: 122, spread: 4.4, gravity: -22
    }
  },
  lightning: {
    id: 'lightning', color: 0x6fe7ff, flash: 0xd8fbff, text: '#8feeff', death: 'shock',
    deathFx: {
      colors: [0xffffff, 0xaaf5ff, 0x46bfff],
      shape: 'spark', speed: 150, spread: 5.4, gravity: 35
    }
  },
  void: {
    id: 'void', color: 0xa46cff, flash: 0xe0c7ff, text: '#cfadff', death: 'collapse',
    deathFx: {
      colors: [0xe5c7ff, 0x9d5cff, 0x3c215e],
      shape: 'shard', speed: 78, spread: 6.1, gravity: -10
    }
  },
  explosive: {
    id: 'explosive', color: 0xffb12f, flash: 0xffedba, text: '#ffd16f', death: 'blast',
    deathFx: {
      colors: [0xfff2bc, 0xffaf2f, 0xe84925],
      shape: 'shard', speed: 172, spread: 5.8, gravity: 180
    }
  },
  laser: {
    id: 'laser', color: 0xff7759, flash: 0xfff4c9, text: '#ffb095', death: 'sear',
    deathFx: {
      colors: [0xffffff, 0xffd080, 0xff5938],
      shape: 'spark', speed: 138, spread: 1.15, gravity: 55
    }
  },
  support: {
    id: 'support', color: 0x9ce98d, flash: 0xe5ffdc, text: '#baf5aa', death: 'pop',
    deathFx: {
      colors: [0xfff2a3, 0xc9f49c, 0x7ddf86],
      shape: 'feather', speed: 142, spread: 3.6, gravity: 190
    }
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
