const MOMENTS = {
  'double-shot': [{ title: 'TWIN VOLLEY', changes: ['1 → 2 Eier', 'Zwillingsformation'] }],
  'triple-shot': [{ title: 'TRIPLE VOLLEY', changes: ['2 → 3 Eier', 'Breite Formation'] }],
  'fire-eggs': [
    { title: 'EMBER SHELL', changes: ['+10 Schaden', 'Feuerprojektil'] },
    { title: 'BLAZE SHELL', changes: ['+20 gesamt', 'Größere Flamme'] },
    { title: 'WHITE-HOT YOLK', changes: ['+30 gesamt', 'Weißglühender Kern'] }
  ],
  'primary-ace-rank': [
    { title: 'TWIN LOCK', changes: ['Jeder 2. Angriff: 2 Eier', 'Stärkere Zielsuche'] },
    { title: 'DEADEYE SHELL', changes: ['Jeder 4. Angriff: Krit', '+Pierce & Ricochet'] },
    { title: 'HUNTER ARRAY', changes: ['Dauerhaft 2 Eier', 'Große Goldprojektile'] }
  ],
  'primary-artillery-rank': [
    { title: 'HEAVY LOAD', changes: ['Größere Granate', '+12 Explosionsradius'] },
    { title: 'SHRAPNEL YOLK', changes: ['4 Mini-Blasts', 'Flächendeckender Einschlag'] },
    { title: 'SIEGE LOAD', changes: ['Massive Granate', 'Zweite Druckwelle'] }
  ],
  'primary-storm-rank': [
    { title: 'STATIC FORK', changes: ['+1 Kettensprung', '+35 Sprungreichweite'] },
    { title: 'ARC PAIR', changes: ['1 → 2 Storm Eggs', 'Versetzte Impulse'] },
    { title: 'STORM CIRCUIT', changes: ['3 Kettensprünge', '+55 Sprungreichweite'] }
  ],
  'faster-eggs': [
    { title: 'FASTER CYCLE', changes: ['−18 % Abklingzeit'] },
    { title: 'RAPID CYCLE', changes: ['Erneut −18 %'] },
    { title: 'HIGH CADENCE', changes: ['Erneut −18 %'] },
    { title: 'MAXIMUM CADENCE', changes: ['Erneut −18 %'] }
  ],
  'golden-egg': [
    { title: 'GOLDEN EGG', changes: ['1 schweres Ei', '60 Schaden · 3 Pierce'] },
    { title: 'HEAVY YOLK', changes: ['Größeres Projektil', 'Breiterer Treffer'] },
    { title: 'SOLAR SPARKS', changes: ['Funken springen weiter', 'Stärkere Goldspur'] },
    { title: 'TWIN SUN', changes: ['1 → 2 Golden Eggs', 'Versetzte Ziele'] }
  ],
  'orbit-eggs': [
    { title: 'FIRST ORBIT', changes: ['1 Orbit-Ei', '80 Radius'] },
    { title: 'TWIN ORBIT', changes: ['1 → 2 Orbit-Eier', '90 Radius'] },
    { title: 'GOLDEN TRIAD', changes: ['2 → 3 Orbit-Eier', '100 Radius'] },
    { title: 'DOUBLE RING', changes: ['3 → 4 Orbit-Eier', '2 Umlaufbahnen'] }
  ],
  'molotov-egg': [
    { title: 'FIRE PATCH', changes: ['90 Radius', '3,0 s Branddauer'] },
    { title: 'WIDER BURN', changes: ['90 → 108 Radius', '12 Schaden/Tick'] },
    { title: 'PULSE FIRE', changes: ['108 → 124 Radius', 'Sichtbare Schadenspulse'] },
    { title: 'TWIN PANS', changes: ['1 → 2 Brandfelder', '4,0 s Dauer'] }
  ],
  'lightning-comb': [
    { title: 'CHAIN SPARK', changes: ['Bis zu 3 Ziele', '34 Basisschaden'] },
    { title: 'WIDER CHAIN', changes: ['3 → 4 Ziele', '44 Basisschaden'] },
    { title: 'FORK BURST', changes: ['4 → 5 Ziele', 'Verzweigter End-Burst'] },
    { title: 'STORM DISCHARGE', changes: ['5 → 6 Ziele', 'Zentrale Entladung'] }
  ],
  'support-chick': [
    { title: 'WINGMATE', changes: ['1 Begleiter', '17 Schaden'] },
    { title: 'DOUBLE TAP', changes: ['2 Schüsse/Salve', '+1 Pierce'] },
    { title: 'CRIPPLING YOLK', changes: ['Treffer verlangsamen', '0,7 s Debuff'] },
    { title: 'SECOND WINGMATE', changes: ['1 → 2 Begleiter'] },
    { title: 'CHICK FORMATION', changes: ['2 → 3 Begleiter', 'Schnellere Salven'] }
  ],
  'rocket-egg': [
    { title: 'EGGSHELL ROCKET', changes: ['48 Flächenschaden', '82 Radius'] },
    { title: 'REINFORCED ROCKET', changes: ['48 → 64 Schaden', '82 → 100 Radius'] },
    { title: 'CLUSTER WARHEAD', changes: ['64 → 80 Schaden', '3 Cluster-Blasts'] },
    { title: 'HEAVY SALVO', changes: ['1 → 2 Raketen', '132 Radius'] }
  ],
  'void-nest': [
    { title: 'VOID NEST', changes: ['132 Radius', '4,2 s Sog'] },
    { title: 'DEEPER GRAVITY', changes: ['132 → 150 Radius', 'Stärkerer Sog'] },
    { title: 'DARK CORE', changes: ['150 → 170 Radius', '5,4 s Dauer'] },
    { title: 'EVENT HORIZON', changes: ['170 → 190 Radius', '6,0 s Kontrolle'] }
  ],
  'laser-comb': [
    { title: 'COMB BEAM', changes: ['48 Schaden', '610 Reichweite'] },
    { title: 'HOTTER CORE', changes: ['Breiterer Strahl', 'Längeres Nachglühen'] },
    { title: 'SIDE BEAM', changes: ['1 → 2 Strahlen', 'Parallele Linie'] },
    { title: 'WHITE-HOT COMB', changes: ['Maximale Strahlbreite', '0,58 s Nachentladung'] }
  ],
  'max-hp': [{ title: 'HARDIER ROOSTER', changes: ['+25 maximale HP', '+25 aktuelle HP'] }],
  'move-speed': [{ title: 'QUICK FEET', changes: ['+24 Bewegungstempo'] }],
  armor: [{ title: 'HARD SHELL', changes: ['−3 Trefferschaden', 'Minimum 1'] }],
  regen: [{ title: 'SECOND YOLK', changes: ['+1,25 HP/s'] }],
  'xp-magnet': [{ title: 'WIDER MAGNET', changes: ['+55 Sammelradius'] }],
  'piercing-eggs': [{ title: 'PIERCING SHELL', changes: ['+1 durchdrungenes Ziel'] }],
  'bigger-eggs': [{ title: 'BIGGER SHELLS', changes: ['+5 Trefferradius', 'Größere Basis-Eier'] }],
  'swift-shells': [{ title: 'SWIFT SHELLS', changes: ['+70 Projektiltempo'] }],
  'critical-yolk': [{ title: 'CRITICAL YOLK', changes: ['+10 % Krit-Chance'] }],
  'ricochet-eggs': [{ title: 'RICOCHET SHELL', changes: ['+1 Abprallziel'] }],
  'shell-shock': [{ title: 'SHELL SHOCK', changes: ['+110 Rückstoßimpuls'] }],
  'second-wind': [{ title: 'SECOND WIND', changes: ['1 Wiederbelebung', '40 % HP · 1,5 s Schutz'] }]
};

const EVOLUTION_MOMENTS = {
  'evo-sunshot-array': ['SUNSHOT ARRAY', ['3 Sonnen-Eier', 'Krit · Pierce · Ricochet']],
  'evo-siegebreaker-shell': ['SIEGEBREAKER', ['Panzerbrechend', 'Massive Doppelwelle']],
  'evo-tempest-crown': ['TEMPEST CROWN', ['Zwillings-Sturmeier', '+3 Kettensprünge']],
  'evo-solar-scramble': ['SOLAR SCRAMBLE', ['3 brennende Sonnen-Eier', 'Dreifach-Salve']],
  'evo-thunder-roost': ['THUNDER ROOST', ['Bis zu 10 Ziele', 'Sturm-Endsequenz']],
  'evo-shell-halo': ['SHELL HALO', ['6 Orbit-Eier', '2 atmende Umlaufbahnen']],
  'evo-broodstorm': ['BROODSTORM', ['3 schwere Raketen', '112 Schaden · 158 Radius']],
  'evo-singularity-nest': ['SINGULARITY NEST', ['1 gewaltiger Schwerkern', '225 Radius · 7,2 s']],
  'evo-phoenix-pan': ['PHOENIX PAN', ['2 Feuerpfannen', 'Größere Brandfelder']],
  'evo-dawn-laser': ['DAWN PRISM', ['3 Prismastrahlen', 'Breites Wirkungsband']],
  'evo-chick-squadron': ['CHICK SQUADRON', ['4 Support Chicks', 'Schnelle Doppelsalven']]
};

export function getUpgradePresentation(upgrade, nextRank) {
  if (upgrade.evolution) {
    const [title, changes] = EVOLUTION_MOMENTS[upgrade.id] ?? [upgrade.name.toUpperCase(), ['Evolution freigeschaltet']];
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
