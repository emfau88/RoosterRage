// Timers and drawing share the paused simulation clock. Shutdown removes both
// drawing and pending damage callbacks instead of leaving detached effects.
export function runCombatVisual(scene, visual, duration, draw, onDestroy) {
  const startedAt=scene.time.now;
  const record={visual,active:true,timers:[],destroy:()=>{
    if(!record.active)return;
    record.active=false;
    scene.events.off('postupdate',update);scene.events.off('shutdown',record.destroy);
    record.timers.forEach(timer=>timer.remove(false));
    visual.destroy();onDestroy?.(record);
  }};
  const update=()=>{
    const age=scene.time.now-startedAt;
    if(age>=duration){record.destroy();return;}
    draw(age);
  };
  scene.events.on('postupdate',update);scene.events.once('shutdown',record.destroy);update();
  return record;
}
