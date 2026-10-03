// Short material fragments stay below hazards. Hard cap bounds mass destruction.
export function playPropBreak(scene, kind, x, y) {
  if (!scene.propBreakBursts) {
    scene.propBreakBursts = new Set();
    scene.events.once('shutdown', () => {
      scene.propBreakBursts.forEach(group => group.forEach(p => { scene.tweens.killTweensOf(p); if (p.active) p.destroy(); }));
      scene.propBreakBursts.clear();
      scene.propBreakBursts = null;
    });
  }
  const active = scene.propBreakBursts;
  if (active.size >= 8) return false;
  const group = [];
  active.add(group);
  const hay = kind === 'bale' || kind === 'hay';
  const dust = scene.add.ellipse(x, y+5, hay ? 43 : 34, 17, hay ? 0xd9b15c : 0x9b714b, 0.2).setDepth(4.8);
  group.push(dust);
  scene.tweens.add({targets:dust,scale:1.5,alpha:0,duration:260});
  for (let i=0;i<8;i++) {
    const angle = i*Math.PI/4 + .2;
    const fragment = scene.add.rectangle(x,y,hay ? 3 : 6+(i%3)*2,hay ? 12 : 4,
      hay ? [0xe8c775,0xc79943][i%2] : [0xd6a465,0x845631][i%2], .92)
      .setRotation(angle).setDepth(8);
    group.push(fragment);
    scene.tweens.add({targets:fragment,x:x+Math.cos(angle)*(22+i%3*8),
      y:y+Math.sin(angle)*18-12,rotation:angle+(i%2 ? 1 : -1),duration:150,ease:'Cubic.Out',
      onComplete:()=>scene.tweens.add({targets:fragment,y:fragment.y+12,alpha:0,
        scale:.7,duration:180,ease:'Quad.In'})});
  }
  scene.time.delayedCall(360,()=>{
    group.forEach(p=>{scene.tweens.killTweensOf(p);p.destroy();}); active.delete(group);
  });
  return true;
}
