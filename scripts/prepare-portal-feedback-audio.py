"""Original deterministic short effects; no sampled recordings or external licenses."""
from pathlib import Path
import math, random, struct, wave
root=Path(__file__).resolve().parents[1]/'src/assets/audio/portal-v1'
root.mkdir(parents=True,exist_ok=True)
rate=22050
for name,duration in [('enemy-dash',.24),('blast-shell-impact',.28),('orbit-contact',.14)]:
    rng=random.Random(name); values=[]; low=0
    for i in range(round(duration*rate)):
        t=i/rate; p=t/duration; noise=rng.uniform(-1,1); low=low*.75+noise*.25
        if name=='enemy-dash':
            env=math.sin(math.pi*p)**1.5
            sample=(low*.5+math.sin(2*math.pi*(180*t+240*t*t))*.15)*env
        elif name=='orbit-contact':
            env=(1-p)**3*min(1,t/.002)
            sample=(math.sin(2*math.pi*740*t)*.55+math.sin(2*math.pi*1110*t)*.2)*env
        else:
            env=(1-p)**3*min(1,t/.003)
            sample=(low*.65+math.sin(2*math.pi*(100*t-95*t*t))*.5)*env
        values.append(struct.pack('<h',round(max(-1,min(1,sample))*.65*32767)))
    with wave.open(str(root/f'{name}.wav'),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(b''.join(values))
print('Three original short WAV effects exported.')
