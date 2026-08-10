export const ENEMY_ROLE_MATRIX = Object.freeze([
  { id: 'fodder', purpose: 'Dichte und Ressourcenfluss', primaryDanger: false, counterplay: 'Freie Bewegung und Flaechenschaden' },
  { id: 'runner', purpose: 'Schneller Positionsdruck', primaryDanger: true, counterplay: 'Frueh seitlich schneiden' },
  { id: 'tank', purpose: 'Blockiert Schusslinien', primaryDanger: true, counterplay: 'Priorisieren oder umgehen' },
  { id: 'shooter', purpose: 'Erzwingt Fernkampfbewegung', primaryDanger: true, counterplay: 'Telegraphierte Linie verlassen' },
  { id: 'area-denial', purpose: 'Sperrt Bewegungssektoren', primaryDanger: true, counterplay: 'Offene Route vor der Salve waehlen' },
  { id: 'exploder', purpose: 'Bestrafte Nahbereichs-Kills', primaryDanger: true, counterplay: 'Explosionsring nach dem Kill verlassen' },
  { id: 'support', purpose: 'Verstaerkt Gegnergruppen', primaryDanger: false, counterplay: 'Auraquelle zuerst ausschalten' },
  { id: 'summoner', purpose: 'Erzeugt kontrollierte Zusatzdichte', primaryDanger: true, counterplay: 'Beschwoer-Telegraph unterbrechen' }
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
