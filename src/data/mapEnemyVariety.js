import { RandomSystem } from '../systems/RandomSystem.js';

export const MAP_ENEMY_SKIN_SHARE = 0.2;
const ALLEY_WEIGHT = { 'open-yard': 0.5, 'vertical-run': 0.85, 'square-coop': 0.15 };

// A private per-wave seed keeps previews/catalog reads from consuming gameplay,
// upgrade or spawn RNG, and gives a restart with the same seed the same roster.
export function addMapVarietyToWave(wave, waveNumber, runSeed, arenaId) {
  if (wave.bossWave) return { ...wave };
  const seed = `map-variety-v1:${runSeed}:${arenaId}:${waveNumber}`;
  const rng = new RandomSystem(seed);
  const extraCount = waveNumber < 5 ? waveNumber : rng.int(3, 5, 'count');
  const specialCount = waveNumber === 1 ? 0 : waveNumber < 5 ? 1 : rng.int(1, 2, 'special-count');
  const alleyWeight = ALLEY_WEIGHT[arenaId] ?? 0.5;
  const extras = Array.from({ length: extraCount }, (_, index) => {
    const alley = rng.chance(alleyWeight, 'palette');
    return index < specialCount
      ? { kind: waveNumber < 4 || alley ? 'map-rammer' : 'map-stomper' }
      : { kind: 'kornkrabbler', skin: alley ? 'alley' : 'coop' };
  });
  return {
    ...wave,
    count: wave.count + extraCount,
    baseCount: wave.count,
    variety: {
      seed, alleyWeight, extraCount, specialCount,
      // Jitter the slots within spaced bands, never dump extras after the finale.
      extras: rng.shuffle(extras, 'extra-order').map((enemy, index) => ({
        enemy,
        fraction: (index + 1 + rng.float(-0.2, 0.2, 'placement')) / (extraCount + 1)
      }))
    }
  };
}

export function applyMapVariety(queue, plan, makeEnemy) {
  if (!plan) return queue;
  const rng = new RandomSystem(plan.seed);
  const eligible = queue.flatMap((enemy, index) => enemy.type === 'kornkrabbler' ? [index] : []);
  const selected = new Set(rng.shuffle(eligible, 'skin-slots').slice(0, Math.round(eligible.length * MAP_ENEMY_SKIN_SHARE)));
  const skinned = queue.map((enemy, index) => selected.has(index)
    ? applyKornkrabblerSkin(enemy, rng.chance(plan.alleyWeight, 'skin-palette') ? 'alley' : 'coop')
    : enemy);
  const eliteStart = skinned.findIndex(enemy => enemy.elite || enemy.boss);
  const regularCount = eliteStart < 0 ? skinned.length : eliteStart;
  const slots = plan.extras.map(({ enemy, fraction }) => ({
    at: Math.max(1, Math.min(regularCount - 1, Math.round(fraction * regularCount))),
    config: { ...makeEnemy(enemy), mapVarietyExtra: true }
  }));
  const result = [];
  skinned.forEach((enemy, index) => {
    slots.filter(slot => slot.at === index).forEach(slot => result.push(slot.config));
    result.push(enemy);
  });
  return result;
}

export function applyKornkrabblerSkin(enemy, skin) {
  if (enemy.type !== 'kornkrabbler' || !['alley', 'coop'].includes(skin)) return enemy;
  const texture = `enemy-kornkrabbler-${skin}-run`;
  return { ...enemy, variantSkin: skin, texture, animation: `${texture}-left`, directionalAnimationPrefix: texture };
}
