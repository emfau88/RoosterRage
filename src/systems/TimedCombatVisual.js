// Use the same smoothed/scaled clock as Phaser damage timers. Raw scene.time.now
// can jump ahead after a long frame while TimerEvent.elapsed advances gradually.
export function runCombatVisual(scene, visual, duration, draw, onDestroy) {
  const record={visual,active:true,timers:[],destroy:()=>{
    if(!record.active)return;
    record.active=false;
    scene.events.off('postupdate',update);scene.events.off('shutdown',record.destroy);
    record.timers.forEach(timer=>timer.remove(false));
    visual.destroy();onDestroy?.(record);
  }};
  // Cleanup happens in postupdate, after all due damage timers were processed.
  // An expiry callback here could cancel a due hit on a long frame.
  const timeline=scene.time.addEvent({delay:duration});
  record.timers.push(timeline);
  const update=()=>{
    const age=timeline.elapsed;
    if(age>=duration){record.destroy();return;}
    draw(age);
  };
  scene.events.on('postupdate',update);scene.events.once('shutdown',record.destroy);update();
  return record;
}
