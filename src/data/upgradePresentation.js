const MOMENTS = {
  'double-shot': [{ title: 'TWIN VOLLEY', changes: ['1 → 2 eggs', 'Twin formation'] }],
  'triple-shot': [{ title: 'TRIPLE VOLLEY', changes: ['2 → 3 eggs', 'Wide formation'] }],
  'fire-eggs': [
    { title: 'EMBER SHELL', changes: ['+10 damage', 'Fire projectile'] },
    { title: 'BLAZE SHELL', changes: ['+20 total', 'Larger flame'] },
    { title: 'WHITE-HOT YOLK', changes: ['+30 total', 'White-hot core'] }
  ],
  'primary-ace-rank': [
    { title: 'TWIN LOCK', changes: ['Every 2nd attack: 2 eggs', 'Stronger homing'] },
    { title: 'DEADEYE SHELL', changes: ['Every 4th attack: critical', '+Pierce & ricochet'] },
    { title: 'HUNTER ARRAY', changes: ['Permanent 2 eggs', 'Large golden projectiles'] }
  ],
  'primary-artillery-rank': [
    { title: 'HEAVY LOAD', changes: ['Larger shell', '+12 explosion radius'] },
    { title: 'SHRAPNEL YOLK', changes: ['4 mini-blasts', 'Area-covering impact'] },
    { title: 'SIEGE LOAD', changes: ['Massive shell', 'Second shockwave'] }
  ],
  'primary-storm-rank': [
    { title: 'STATIC FORK', changes: ['+1 chain jump', '+35 chain range'] },
    { title: 'ARC PAIR', changes: ['1 → 2 Storm Eggs', 'Staggered pulses'] },
    { title: 'STORM CIRCUIT', changes: ['3 chain jumps', '+55 chain range'] }
  ],
  'faster-eggs': [
    { title: 'FASTER CYCLE', changes: ['−18% cooldown'] },
    { title: 'RAPID CYCLE', changes: ['Another −18%'] },
    { title: 'HIGH CADENCE', changes: ['Another −18%'] },
    { title: 'MAXIMUM CADENCE', changes: ['Another −18%'] }
  ],
  'golden-egg': [
    { title: 'GOLDEN EGG', changes: ['1 heavy egg', '60 damage · 3 pierces'] },
    { title: 'HEAVY YOLK', changes: ['Larger projectile', 'Wider hit'] },
    { title: 'SOLAR SPARKS', changes: ['Sparks jump farther', 'Stronger golden trail'] },
    { title: 'TWIN SUN', changes: ['1 → 2 Golden Eggs', 'Staggered targets'] }
  ],
  'orbit-eggs': [
    { title: 'FIRST ORBIT', changes: ['1 Orbit Egg', '80 radius'] },
    { title: 'TWIN ORBIT', changes: ['1 → 2 Orbit Eggs', '90 radius'] },
    { title: 'GOLDEN TRIAD', changes: ['2 → 3 Orbit Eggs', '100 radius'] },
    { title: 'DOUBLE RING', changes: ['3 → 4 Orbit Eggs', '2 orbits'] }
  ],
  'molotov-egg': [
    { title: 'FIRE PATCH', changes: ['90 radius', '3.0 s burn duration'] },
    { title: 'WIDER BURN', changes: ['90 → 108 radius', '12 damage/tick'] },
    { title: 'PULSE FIRE', changes: ['108 → 124 radius', 'Visible damage pulses'] },
    { title: 'TWIN PANS', changes: ['1 → 2 fire patches', '4.0 s duration'] }
  ],
  'lightning-comb': [
    { title: 'CHAIN SPARK', changes: ['Up to 3 targets', '34 base damage'] },
    { title: 'WIDER CHAIN', changes: ['3 → 4 targets', '44 base damage'] },
    { title: 'FORK BURST', changes: ['4 → 5 targets', 'Branching final burst'] },
    { title: 'STORM DISCHARGE', changes: ['5 → 6 targets', 'Central discharge'] }
  ],
  'support-chick': [
    { title: 'WINGMATE', changes: ['1 companion', '17 damage'] },
    { title: 'DOUBLE TAP', changes: ['2 shots/volley', '+1 pierce'] },
    { title: 'CRIPPLING YOLK', changes: ['Hits slow', '0.7 s debuff'] },
    { title: 'SECOND WINGMATE', changes: ['1 → 2 companions'] },
    { title: 'CHICK FORMATION', changes: ['2 → 3 companions', 'Faster volleys'] }
  ],
  'rocket-egg': [
    { title: 'EGGSHELL ROCKET', changes: ['48 area damage', '82 radius'] },
    { title: 'REINFORCED ROCKET', changes: ['48 → 64 damage', '82 → 100 radius'] },
    { title: 'CLUSTER WARHEAD', changes: ['64 → 80 damage', '3 cluster blasts'] },
    { title: 'HEAVY SALVO', changes: ['1 → 2 rockets', '132 radius'] }
  ],
  'void-nest': [
    { title: 'VOID NEST', changes: ['132 radius', '4.2 s pull'] },
    { title: 'DEEPER GRAVITY', changes: ['132 → 150 radius', 'Stronger pull'] },
    { title: 'DARK CORE', changes: ['150 → 170 radius', '5.4 s duration'] },
    { title: 'EVENT HORIZON', changes: ['170 → 190 radius', '6.0 s control'] }
  ],
  'laser-comb': [
    { title: 'COMB BEAM', changes: ['48 damage', '610 range'] },
    { title: 'HOTTER CORE', changes: ['Wider beam', 'Longer afterglow'] },
    { title: 'SIDE BEAM', changes: ['1 → 2 beams', 'Parallel line'] },
    { title: 'WHITE-HOT COMB', changes: ['Maximum beam width', '0.58 s afterglow'] }
  ],
  'max-hp': [{ title: 'HARDIER ROOSTER', changes: ['+25 maximum HP', '+25 current HP'] }],
  'move-speed': [{ title: 'QUICK FEET', changes: ['+24 movement speed'] }],
  armor: [{ title: 'HARD SHELL', changes: ['−3 damage per hit', 'Minimum 1'] }],
  regen: [{ title: 'SECOND YOLK', changes: ['+1.25 HP/s'] }],
  'xp-magnet': [{ title: 'WIDER MAGNET', changes: ['+55 pickup radius'] }],
  'piercing-eggs': [{ title: 'PIERCING SHELL', changes: ['+1 pierced target'] }],
  'bigger-eggs': [{ title: 'BIGGER SHELLS', changes: ['+5 hit radius', 'Larger primary eggs'] }],
  'swift-shells': [{ title: 'SWIFT SHELLS', changes: ['+70 projectile speed'] }],
  'critical-yolk': [{ title: 'CRITICAL YOLK', changes: ['+10% critical chance'] }],
  'ricochet-eggs': [{ title: 'RICOCHET SHELL', changes: ['+1 ricochet target'] }],
  'shell-shock': [{ title: 'SHELL SHOCK', changes: ['+110 knockback force'] }],
  'second-wind': [{ title: 'SECOND WIND', changes: ['1 revival', '40% HP · 1.5 s protection'] }]
};

const EVOLUTION_MOMENTS = {
  'evo-sunshot-array': ['SUNSHOT ARRAY', ['3 sun eggs', 'Critical · Pierce · Ricochet']],
  'evo-siegebreaker-shell': ['SIEGEBREAKER', ['Armor-piercing', 'Massive double wave']],
  'evo-tempest-crown': ['TEMPEST CROWN', ['Twin storm eggs', '+3 chain jumps']],
  'evo-solar-scramble': ['SOLAR SCRAMBLE', ['3 burning sun eggs', 'Triple volley']],
  'evo-thunder-roost': ['THUNDER ROOST', ['Up to 10 targets', 'Storm finale']],
  'evo-shell-halo': ['SHELL HALO', ['6 Orbit Eggs', '2 breathing orbits']],
  'evo-broodstorm': ['BROODSTORM', ['3 heavy rockets', '112 damage · 158 radius']],
  'evo-singularity-nest': ['SINGULARITY NEST', ['1 massive gravity core', '225 radius · 7.2 s']],
  'evo-phoenix-pan': ['PHOENIX PAN', ['2 fire pans', 'Larger burning areas']],
  'evo-dawn-laser': ['DAWN PRISM', ['3 prism beams', 'Wide area of effect']],
  'evo-chick-squadron': ['CHICK SQUADRON', ['4 Support Chicks', 'Rapid twin volleys']]
};

export function getUpgradePresentation(upgrade, nextRank) {
  if (upgrade.evolution) {
    const [title, changes] = EVOLUTION_MOMENTS[upgrade.id] ?? [upgrade.name.toUpperCase(), ['Evolution unlocked']];
    return { title, changes, tone: 'evolution' };
  }
  const stages = MOMENTS[upgrade.id];
  const stageIndex = Math.max(0, (nextRank ?? 1) - 1);
  const stage = stages?.[stageIndex] ?? (stages?.length === 1 ? stages[0] : null);
  return {
    title: stage?.title ?? (nextRank > 1 ? `RANK ${nextRank}` : upgrade.name.toUpperCase()),
    changes: stage?.changes ?? [upgrade.description],
    tone: upgrade.consumable ? 'instant' : nextRank > 1 ? 'rank-up' : 'new'
  };
}
