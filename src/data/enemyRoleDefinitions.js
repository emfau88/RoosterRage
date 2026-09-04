export const ENEMY_ROLE_MATRIX = Object.freeze([
  { id: 'fodder', purpose: 'Crowd density and resource flow', primaryDanger: false, counterplay: 'Keep moving and use area damage' },
  { id: 'runner', purpose: 'Fast positional pressure', primaryDanger: true, counterplay: 'Cut sideways early' },
  { id: 'tank', purpose: 'Blocks firing lanes', primaryDanger: true, counterplay: 'Prioritize or evade' },
  { id: 'shooter', purpose: 'Forces ranged movement', primaryDanger: true, counterplay: 'Leave the telegraphed line' },
  { id: 'area-denial', purpose: 'Locks down movement sectors', primaryDanger: true, counterplay: 'Choose an open route before the volley' },
  { id: 'exploder', purpose: 'Punishes close-range kills', primaryDanger: true, counterplay: 'Leave the blast ring after the kill' },
  { id: 'support', purpose: 'Empowers enemy groups', primaryDanger: false, counterplay: 'Eliminate the aura source first' },
  { id: 'summoner', purpose: 'Creates controlled extra density', primaryDanger: true, counterplay: 'Interrupt the summon telegraph' }
]);

export const ENCOUNTER_STANDARDS = Object.freeze({
  normalTelegraphMs: 300,
  heavyTelegraphMs: 500,
  normalProjectileBudget: 12,
  playerProtectionRadius: 140,
  eliteAnnouncementMs: 1700,
  bossEntryProtectionMs: 1300
});

export function getEnemyRole(role) {
  return ENEMY_ROLE_MATRIX.find((entry) => entry.id === role) ?? null;
}
