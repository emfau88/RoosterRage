from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44100
OUT_DIR = Path("src/assets/audio")


def clamp(value: float) -> float:
    return max(-1.0, min(1.0, value))


def envelope(t: float, duration: float, attack: float = 0.006, release: float = 0.06) -> float:
    if t < attack:
        return t / attack
    remaining = duration - t
    if remaining < release:
        return max(0.0, remaining / release)
    return 1.0


def tone(
    duration: float,
    start_freq: float,
    end_freq: float | None = None,
    volume: float = 0.25,
    wave_type: str = "sine",
    noise: float = 0.0,
    attack: float = 0.006,
    release: float = 0.06,
) -> list[float]:
    end_freq = end_freq if end_freq is not None else start_freq
    samples = []
    phase = 0.0
    total = max(1, int(duration * SAMPLE_RATE))
    for i in range(total):
        t = i / SAMPLE_RATE
        mix = i / max(1, total - 1)
        freq = start_freq + (end_freq - start_freq) * mix
        phase += (math.tau * freq) / SAMPLE_RATE
        if wave_type == "square":
            value = 1.0 if math.sin(phase) >= 0 else -1.0
        elif wave_type == "triangle":
            value = 2.0 * abs(2.0 * ((phase / math.tau) % 1.0) - 1.0) - 1.0
        else:
            value = math.sin(phase)
        value = value * (1.0 - noise) + random.uniform(-1, 1) * noise
        samples.append(value * volume * envelope(t, duration, attack, release))
    return samples


def silence(duration: float) -> list[float]:
    return [0.0] * int(duration * SAMPLE_RATE)


def mix(*tracks: list[float]) -> list[float]:
    length = max(len(track) for track in tracks)
    output = [0.0] * length
    for track in tracks:
        for i, value in enumerate(track):
            output[i] += value
    peak = max(0.01, max(abs(value) for value in output))
    if peak > 0.95:
        output = [value / peak * 0.95 for value in output]
    return output


def delay(track: list[float], seconds: float) -> list[float]:
    return silence(seconds) + track


def write_wav(name: str, samples: list[float]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.wav"
    with wave.open(str(path), "wb") as file:
      file.setnchannels(1)
      file.setsampwidth(2)
      file.setframerate(SAMPLE_RATE)
      frames = b"".join(struct.pack("<h", int(clamp(sample) * 32767)) for sample in samples)
      file.writeframes(frames)
    print(f"wrote {path} {path.stat().st_size} bytes")


def main() -> None:
    random.seed(7)
    write_wav("egg-shot", mix(
        tone(0.09, 760, 520, 0.18, "triangle", 0.02, release=0.035),
        delay(tone(0.045, 1280, 860, 0.08, "sine", release=0.025), 0.012),
    ))
    write_wav("enemy-hit", mix(
        tone(0.075, 230, 150, 0.16, "triangle", 0.18, release=0.04),
    ))
    write_wav("enemy-pop", mix(
        tone(0.13, 320, 90, 0.19, "triangle", 0.28, release=0.07),
        delay(tone(0.055, 720, 420, 0.08, "sine", release=0.03), 0.015),
    ))
    write_wav("xp-pickup", mix(
        tone(0.075, 960, 1380, 0.12, "sine", release=0.025),
        delay(tone(0.08, 1440, 1820, 0.08, "sine", release=0.03), 0.04),
    ))
    write_wav("level-up", mix(
        tone(0.13, 640, 960, 0.12, "sine", release=0.04),
        delay(tone(0.13, 820, 1280, 0.13, "sine", release=0.05), 0.09),
        delay(tone(0.18, 1180, 1720, 0.11, "sine", release=0.09), 0.18),
    ))
    write_wav("player-hit", mix(
        tone(0.16, 180, 92, 0.22, "triangle", 0.12, release=0.08),
    ))
    write_wav("molotov-impact", mix(
        tone(0.22, 170, 78, 0.18, "triangle", 0.35, release=0.12),
        delay(tone(0.18, 560, 360, 0.08, "sine", 0.16, release=0.1), 0.02),
    ))
    write_wav("rocket-explosion", mix(
        tone(0.24, 120, 46, 0.24, "triangle", 0.45, release=0.16),
        delay(tone(0.08, 680, 260, 0.09, "square", 0.12, release=0.04), 0.015),
    ))
    write_wav("lightning", mix(
        tone(0.16, 1640, 720, 0.13, "square", 0.22, release=0.055),
        delay(tone(0.06, 2600, 1100, 0.08, "sine", 0.1, release=0.025), 0.018),
    ))
    write_wav("laser", mix(
        tone(0.18, 940, 980, 0.12, "sine", release=0.055),
        tone(0.18, 1880, 1960, 0.05, "triangle", release=0.055),
    ))
    write_wav("void-open", mix(
        tone(0.27, 220, 95, 0.15, "sine", release=0.16),
        delay(tone(0.2, 480, 260, 0.08, "triangle", 0.1, release=0.12), 0.035),
    ))


if __name__ == "__main__":
    main()
