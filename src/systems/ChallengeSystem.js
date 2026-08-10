import { CHALLENGE_DEFINITIONS, getChallengeDefinition } from '../data/challengeDefinitions.js';

export class ChallengeSystem {
  constructor(id = 'standard', requestedArenaId = 'open-yard') {
    this.definition = getChallengeDefinition(id);
    this.requestedArenaId = requestedArenaId;
  }

  get id() {
    return this.definition.id;
  }

  get arenaId() {
    return this.definition.arenaId ?? this.requestedArenaId;
  }

  get modifiers() {
    return this.definition.modifiers;
  }

  getCatalog() {
    return CHALLENGE_DEFINITIONS.map((challenge) => ({
      ...challenge,
      modifiers: { ...challenge.modifiers },
      unlock: { ...challenge.unlock }
    }));
  }

  applyPlayer(player) {
    const modifiers = this.modifiers;
    if (modifiers.playerHpMultiplier) {
      player.maxHp = Math.max(1, Math.round(player.maxHp * modifiers.playerHpMultiplier));
      player.hp = player.maxHp;
    }
    if (modifiers.playerSpeedMultiplier) {
      player.speed = Math.round(player.speed * modifiers.playerSpeedMultiplier);
    }
    if (modifiers.playerDamageMultiplier) {
      player.projectileDamage = Math.max(1, Math.round(
        player.projectileDamage * modifiers.playerDamageMultiplier
      ));
    }
  }

  modifyEnemy(config) {
    const modifiers = this.modifiers;
    const damageMultiplier = modifiers.enemyDamageMultiplier ?? 1;
    const eliteHpMultiplier = config.elite ? modifiers.eliteHpMultiplier ?? 1 : 1;
    const scaleOptional = (value, multiplier) => Number.isFinite(value)
      ? Math.max(0, Math.round(value * multiplier))
      : value;
    return {
      ...config,
      hp: Math.max(1, Math.round(
        config.hp * (modifiers.enemyHpMultiplier ?? 1) * eliteHpMultiplier
      )),
      speed: Math.max(0, Math.round(config.speed * (modifiers.enemySpeedMultiplier ?? 1))),
      damage: Math.max(0, Math.round(config.damage * damageMultiplier)),
      xp: Math.max(0, Math.round(config.xp * (modifiers.xpMultiplier ?? 1))),
      ability: config.ability ? {
        ...config.ability,
        damage: scaleOptional(config.ability.damage, damageMultiplier)
      } : null,
      heavyProjectile: config.heavyProjectile ? {
        ...config.heavyProjectile,
        damage: scaleOptional(config.heavyProjectile.damage, damageMultiplier)
      } : null,
      bossPhases: config.bossPhases?.map((phase) => ({
        ...phase,
        damage: scaleOptional(phase.damage, damageMultiplier),
        ability: phase.ability ? {
          ...phase.ability,
          damage: scaleOptional(phase.ability.damage, damageMultiplier)
        } : phase.ability,
        heavyProjectile: phase.heavyProjectile ? {
          ...phase.heavyProjectile,
          damage: scaleOptional(phase.heavyProjectile.damage, damageMultiplier)
        } : phase.heavyProjectile
      })) ?? config.bossPhases
    };
  }

  modifyWave(wave) {
    const scale = this.modifiers.targetDurationScale ?? 1;
    return {
      ...wave,
      targetDuration: Array.isArray(wave.targetDuration)
        ? wave.targetDuration.map((seconds) => Math.round(seconds * scale))
        : wave.targetDuration
    };
  }

  getState() {
    return {
      id: this.id,
      name: this.definition.name,
      arenaId: this.arenaId,
      modifiers: { ...this.modifiers }
    };
  }
}
