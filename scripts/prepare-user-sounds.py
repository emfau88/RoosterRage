"""Prepare the user-supplied gameplay sounds with ffmpeg."""
from argparse import ArgumentParser
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'art-source' / 'audio' / 'user-sounds'
FILES = {
    'glass': '203377__c_rogers__glass-shattering_05.ogg',
    'fire': 'djartmusic-short-fire-whoosh_1-317280.mp3',
    'bomb': '784205__modusmogulus__cartoon-explosion-designed-on-cassette-tape-lol.wav',
    'chicks': '519193__boaay__baby-chicks-chirp.wav',
    'elite': 'the-vampires-monster-chicken-screams-nervous-343103.mp3',
    'elite-death': 'floraphonic-rubber-chicken-squeak-toy-1-181416.mp3',
}


def encode(output, inputs, filters):
    target = ROOT / 'src' / 'assets' / 'audio' / 'sfx' / output
    target.parent.mkdir(parents=True, exist_ok=True)
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    for key in inputs:
        command += ['-i', str(MASTERS / FILES[key])]
    subprocess.run(command + ['-filter_complex', filters, '-map', '[out]',
        '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '64k',
        '-map_metadata', '-1', str(target)], check=True)
    print(f'{target.relative_to(ROOT)}: {target.stat().st_size} bytes')


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, help='Import the original files once.')
    args = parser.parse_args()
    if args.source_dir:
        MASTERS.mkdir(parents=True, exist_ok=True)
        for filename in FILES.values():
            shutil.copyfile(args.source_dir / filename, MASTERS / filename)
    for filename in FILES.values():
        if not (MASTERS / filename).is_file():
            raise SystemExit(f'Missing audio master: {filename}')

    # Measured fire onset ~0.95 s; useful tail ends ~2.45 s. Keep the full glass
    # shatter, then let the ignition tail decay. One voice keeps the pair together.
    encode('abilities/molotov-impact.mp3', ['glass', 'fire'],
        '[0:a]atrim=end=0.811,asetpts=PTS-STARTPTS,volume=0.85[glass];'
        '[1:a]atrim=start=0.95:end=2.45,asetpts=PTS-STARTPTS,'
        'afade=t=in:d=0.015,afade=t=out:st=1.28:d=0.22,volume=0.45[fire];'
        '[glass][fire]amix=inputs=2:duration=longest:normalize=0,'
        'alimiter=limit=0.9:level=false:latency=true[out]')
    encode('rewards/pickup-bomb.mp3', ['bomb'],
        '[0:a]atrim=end=2.4,asetpts=PTS-STARTPTS,volume=0.8,'
        'afade=t=out:st=2.05:d=0.35[out]')
    encode('rewards/support-chirp.mp3', ['chicks'],
        '[0:a]atrim=end=1.76,asetpts=PTS-STARTPTS,'
        'afade=t=in:d=0.008,afade=t=out:st=1.65:d=0.11[out]')
    # Take one of the separate screams rather than playing the whole seven-second
    # recording. 0.89 rate lowers pitch by about two semitones, baked into the asset.
    encode('enemies/elite-entry.mp3', ['elite'],
        '[0:a]atrim=start=1.3:end=2.17,asetpts=PTS-STARTPTS,'
        'asetrate=42720,aresample=44100,volume=0.7,'
        'afade=t=in:d=0.012,afade=t=out:st=0.85:d=0.127[out]')
    encode('enemies/elite-death.mp3', ['elite-death'],
        '[0:a]asetpts=PTS-STARTPTS,volume=0.8,afade=t=in:d=0.005,'
        'afade=t=out:st=0.698:d=0.07[out]')


if __name__ == '__main__':
    main()
