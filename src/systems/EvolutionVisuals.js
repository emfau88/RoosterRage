const EVOLUTION_IMPACTS = {
  'evo-sunshot-array': { texture: 'evo-sunshot-array-impact', diameter: 58, duration: 150, rotation: 0.16 },
  'evo-siegebreaker-shell': { texture: 'evo-siegebreaker-shell-impact', diameter: 76, duration: 170, rotation: -0.1 },
  'evo-tempest-crown': { texture: 'evo-tempest-crown-impact', diameter: 66, duration: 155, rotation: 0.08 },
  'evo-solar-scramble': { texture: 'evo-solar-scramble-impact', diameter: 90, duration: 185, rotation: 0.22 },
  'evo-phoenix-pan': { texture: 'evo-phoenix-pan-impact', diameter: 108, duration: 205, rotation: 0 },
  'evo-broodstorm': { texture: 'evo-broodstorm-impact', diameter: 124, duration: 210, rotation: 0.12 }
};

export function playEvolutionImpact(scene, source, x, y, overrides = {}) {
  const definition = EVOLUTION_IMPACTS[source];
  if (!definition || !scene.textures.exists(definition.texture)) {
    return null;
  }
  const diameter = overrides.diameter ?? definition.diameter;
  const finalScale = diameter / 256;
  const impact = scene.add.image(x, y, definition.texture)
    .setDepth(overrides.depth ?? 12)
    .setAlpha(overrides.alpha ?? 0.94)
    .setScale(finalScale * 0.7)
    .setRotation(-(definition.rotation ?? 0) * 0.5);
  scene.tweens.add({
    targets: impact,
    alpha: 0,
    scale: finalScale,
    rotation: definition.rotation ?? 0,
    duration: overrides.duration ?? definition.duration,
    ease: 'Quad.Out',
    onComplete: () => impact.destroy()
  });
  return impact;
}
