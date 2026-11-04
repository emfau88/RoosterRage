import { getEnemyAuraGround } from './EnemyAuraVisual.js';

const clamp = value => Math.max(0, Math.min(1, value));

// Small, bounded comic effects driven by the simulation clock. Every effect
// detaches on completion, death, pooled reuse or scene shutdown; pause freezes it.
function animate(scene, enemy, duration, draw, onComplete) {
  const activationId = enemy.activationId, startedAt = scene.time.now;
  const ground = scene.add.graphics().setDepth(2.8);
  const front = scene.add.graphics().setDepth(8.4);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    scene.events.off('postupdate', update);
    scene.events.off('shutdown', cleanup);
    ground.destroy(); front.destroy();
    onComplete?.();
  };
  const update = () => {
    const age = scene.time.now - startedAt;
    if (!enemy.sprite.active || enemy.activationId !== activationId || age >= duration) {
      cleanup(); return;
    }
    ground.clear(); front.clear();
    draw(ground, front, clamp(age / duration), age);
  };
  scene.events.on('postupdate', update);
  scene.events.once('shutdown', cleanup);
  update();
  return cleanup;
}

export function showMapEnemyTelegraph(feedback, enemy, player, ability, { duration }) {
  const scene = feedback.scene, radial = ability.kind === 'slam';
  const activationId = enemy.activationId;
  const angle = enemy.abilityAimAngle ?? Math.atan2(player.sprite.y-enemy.sprite.y,player.sprite.x-enemy.sprite.x);
  const travel = ability.speed * ability.duration / 1000;
  const zone = radial ? {
    x: enemy.sprite.x, y: enemy.sprite.y, radius: ability.radius,
    expiresAt: scene.time.now + duration, source: `telegraph:${enemy.type}`
  } : {
    kind:'line', x:enemy.sprite.x, y:enemy.sprite.y,
    targetX:enemy.sprite.x+Math.cos(angle)*travel, targetY:enemy.sprite.y+Math.sin(angle)*travel,
    radius:22, expiresAt:scene.time.now+duration+ability.duration, source:`telegraph:${enemy.type}:dash`
  };
  scene.enemyDangerZones.push(zone);
  feedback.activeTelegraphs += 1;
  let cleanup;
  cleanup = animate(scene, enemy, duration, (g, front, u, age) => {
    const {x,y} = getEnemyAuraGround(enemy);
    zone.x=enemy.sprite.x; zone.y=enemy.sprite.y;
    if (radial) {
      const radius=ability.radius, ry=radius*ability.groundRadiusYRatio;
      g.fillStyle(0xffaa55,.035+u*.035).fillEllipse(x,y,radius*2,ry*2);
      g.lineStyle(2,0xffbd63,.45+u*.4);
      for(let j=0;j<12;j++) {
        const start=j*Math.PI/6;
        g.beginPath();
        for(let k=0;k<=6;k++) {
          const a=start+.23*k/6,px=x+Math.cos(a)*radius,py=y+Math.sin(a)*ry;
          k?g.lineTo(px,py):g.moveTo(px,py);
        }
        g.strokePath();
      }
    } else {
      zone.targetX=zone.x+Math.cos(angle)*travel; zone.targetY=zone.y+Math.sin(angle)*travel;
      g.lineStyle(2,0xffcf83,.35+u*.5);
      const point=(d,side)=>({x:x+Math.cos(angle)*d-Math.sin(angle)*side,y:y+Math.sin(angle)*d+Math.cos(angle)*side});
      for(let j=1;j<=3;j++) {
        const d=travel*j/3,a=point(d-8,-6),b=point(d,0),c=point(d-8,6);
        g.beginPath().moveTo(a.x,a.y).lineTo(b.x,b.y).lineTo(c.x,c.y).strokePath();
      }
    }
    const top=enemy.sprite.y-enemy.sprite.displayHeight*.6;
    front.lineStyle(3,0xffefb2,.8+Math.sin(age*.015)*.2).lineBetween(enemy.sprite.x,top-6,enemy.sprite.x,top+1);
    front.fillStyle(0xffefb2,1).fillCircle(enemy.sprite.x,top+6,1.6);
  }, () => {
    feedback.enemyTelegraphCleanups.delete(cleanup);
    feedback.activeTelegraphs=Math.max(0,feedback.activeTelegraphs-1);
    if(!enemy.sprite.active || enemy.activationId !== activationId || radial) zone.expiresAt=scene.time.now;
  });
  feedback.enemyTelegraphCleanups.add(cleanup);
  scene.telemetry.record('enemyTelegraphShown',scene.time.now,{
    wave:scene.waveSystem.currentWave,enemyType:enemy.type,duration,heavy:radial,radial
  });
  return cleanup;
}

export function showMapEnemyImpact(scene, enemy, ability, angle = 0) {
  const origin=getEnemyAuraGround(enemy), slam=ability.kind==='slam';
  return animate(scene,enemy,slam?540:ability.duration,(g,front,u)=>{
    if(slam) {
      const radius=ability.radius*Math.sin(Math.min(1,u*1.45)*Math.PI/2);
      g.lineStyle(3*(1-u)+1,0xffdf9a,(1-u)*.85)
        .strokeEllipse(origin.x,origin.y,radius*2,radius*2*ability.groundRadiusYRatio);
      for(let j=0;j<9;j++) {
        const a=j*Math.PI*2/9+.3,d=17+u*(40+j%3*5),x=origin.x+Math.cos(a)*d,y=origin.y+Math.sin(a)*d*.6;
        g.fillStyle(0xa77d52,(1-u)*.5).fillEllipse(x,y,7+u*10,4+u*6);
        const lift=Math.sin(u*Math.PI)*(9+j%3*5);
        front.fillStyle(j%2?0xe5c18b:0xb78e63,1-u).fillTriangle(x-2,y-lift,x+3,y-lift+1,x,y-lift-4);
      }
    } else {
      const {x,y}=getEnemyAuraGround(enemy);
      for(let j=0;j<5;j++) {
        const life=(u*2+j*.17)%1,d=20+life*40,side=j%2?3:-3;
        g.fillStyle(0xe5c18b,(1-life)*.45).fillEllipse(x-Math.cos(angle)*d-Math.sin(angle)*side,y-Math.sin(angle)*d+Math.cos(angle)*side,7+life*9,4+life*4);
      }
      front.lineStyle(1.5,0xe5f3ff,.55);
      for(let j=0;j<3;j++) {
        const side=(j-1)*8,px=enemy.sprite.x-Math.sin(angle)*side,py=enemy.sprite.y+Math.cos(angle)*side;
        front.lineBetween(px-Math.cos(angle)*24,py-Math.sin(angle)*24,px-Math.cos(angle)*39,py-Math.sin(angle)*39);
      }
    }
  });
}
