from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError as error:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from error


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "art-source"
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets"
MANIFEST_PATH = RUNTIME_ROOT / "runtime-assets.json"

RUNTIME_IMAGES = (
    "characters/rooster-ace-walk.png",
    "characters/rooster-artillery-walk.png",
    "characters/rooster-storm-walk.png",
    "characters/rooster-ace-portrait.png",
    "characters/rooster-artillery-portrait.png",
    "characters/rooster-storm-portrait.png",
    "companions/support-chick-orb.png",
    "companions/evo-chick-squadron-companion.png",
    "projectiles/egg.png",
    "projectiles/fire-egg.png",
    "projectiles/heavy-egg.png",
    "projectiles/storm-egg.png",
    "projectiles/golden-egg.png",
    "projectiles/molotov-egg.png",
    "projectiles/rocket-egg.png",
    "projectiles/evolutions/evo-sunshot-array-projectile.png",
    "projectiles/evolutions/evo-siegebreaker-shell-projectile.png",
    "projectiles/evolutions/evo-tempest-crown-projectile.png",
    "projectiles/evolutions/evo-solar-scramble-projectile.png",
    "projectiles/evolutions/evo-phoenix-pan-projectile.png",
    "projectiles/evolutions/evo-broodstorm-projectile.png",
    "projectiles/evolutions/evo-shell-halo-projectile.png",
    "projectiles/evolutions/evo-chick-squadron-projectile.png",
    "projectiles/enemy-shot.png",
    "projectiles/enemy-purple-shot.png",
    "projectiles/enemy-blue-shot.png",
    "projectiles/boss-fireball.png",
    "collectibles/xp-orb.png",
    "pickups/pickup-heal.png",
    "pickups/pickup-bomb.png",
    "pickups/pickup-magnet.png",
    "pickups/pickup-elite-chest.png",
    "pickups/pickup-elite-chest-ajar.png",
    "pickups/pickup-elite-chest-open.png",
    "map/arena-crate.png",
    "map/arena-bale.png",
    "map/arena-wall.png",
    "map/arena-ground-farm.png",
    "map/arena-ground-road.png",
    "map/landmark-barn.png",
    "map/landmark-well.png",
    "meta/kernel-currency.png",
    "meta/mastery-ace.png",
    "meta/mastery-artillery.png",
    "meta/mastery-storm.png",
    "enemy-slime.png",
    "enemies/animations/enemy-slime-wobble.png",
    "enemies/animations/enemy-kornkrabbler-run.png",
    "enemies/animations/enemy-runner-run.png",
    "enemies/animations/enemy-elite-runner-run.png",
    "enemies/animations/enemy-brute-run.png",
    "enemies/animations/enemy-boss-run.png",
    "enemies/animations/enemy-brute-stomp.png",
    "enemies/animations/enemy-spitter-pulse.png",
    "enemies/animations/enemy-spitter-run.png",
    "enemies/animations/enemy-fan-spitter-recoil.png",
    "enemies/animations/enemy-fan-spitter-run.png",
    "enemies/animations/enemy-bomber-bob.png",
    "enemies/animations/enemy-bomber-run.png",
    "enemies/animations/enemy-support-run.png",
    "enemies/animations/enemy-summoner-run.png",
    "enemies/animations/enemy-elite-brute-stomp.png",
    "enemies/animations/enemy-elite-spitter-pulse.png",
    "enemies/animations/enemy-elite-spitter-run.png",
    "fx/fx-atlas-v1-sheet.png",
    "fx/evolutions/evo-sunshot-array-impact.png",
    "fx/evolutions/evo-siegebreaker-shell-impact.png",
    "fx/evolutions/evo-tempest-crown-impact.png",
    "fx/evolutions/evo-solar-scramble-impact.png",
    "fx/evolutions/evo-phoenix-pan-impact.png",
    "fx/evolutions/evo-broodstorm-impact.png",
    "fx/evolutions/evo-thunder-roost-impact.png",
    "fx/evolutions/evo-shell-halo-impact.png",
    "fx/evolutions/evo-singularity-nest-zone.png",
    "fx/evolutions/evo-dawn-laser-emitter.png",
    "fx/evolutions/evo-dawn-laser-impact.png",
    "fx/evolutions/evo-chick-squadron-impact.png",
    "map/arena-ground.png",
    "ui/ui-icons-v1-sheet.png",
)

RUNTIME_SIZES = {
    "meta/kernel-currency.png": (64, 64),
    "meta/mastery-ace.png": (96, 96),
    "meta/mastery-artillery.png": (96, 96),
    "meta/mastery-storm.png": (96, 96),
    "projectiles/evolutions/evo-sunshot-array-projectile.png": (32, 32),
    "projectiles/evolutions/evo-siegebreaker-shell-projectile.png": (40, 40),
    "projectiles/evolutions/evo-tempest-crown-projectile.png": (32, 32),
    "projectiles/evolutions/evo-solar-scramble-projectile.png": (36, 36),
    "projectiles/evolutions/evo-phoenix-pan-projectile.png": (36, 36),
    "projectiles/evolutions/evo-broodstorm-projectile.png": (42, 42),
    "projectiles/evolutions/evo-shell-halo-projectile.png": (40, 40),
    "projectiles/evolutions/evo-chick-squadron-projectile.png": (36, 36),
    "companions/evo-chick-squadron-companion.png": (96, 96),
    "fx/evolutions/evo-sunshot-array-impact.png": (256, 256),
    "fx/evolutions/evo-siegebreaker-shell-impact.png": (256, 256),
    "fx/evolutions/evo-tempest-crown-impact.png": (256, 256),
    "fx/evolutions/evo-solar-scramble-impact.png": (256, 256),
    "fx/evolutions/evo-phoenix-pan-impact.png": (256, 256),
    "fx/evolutions/evo-broodstorm-impact.png": (256, 256),
    "fx/evolutions/evo-thunder-roost-impact.png": (256, 256),
    "fx/evolutions/evo-shell-halo-impact.png": (256, 256),
    "fx/evolutions/evo-singularity-nest-zone.png": (256, 256),
    "fx/evolutions/evo-dawn-laser-emitter.png": (64, 64),
    "fx/evolutions/evo-dawn-laser-impact.png": (256, 256),
    "fx/evolutions/evo-chick-squadron-impact.png": (256, 256),
}

# Animation sheets must retain their cell grid. Unlike individual sprites they
# are resized as one canvas and are never cropped to visible pixels.
RUNTIME_SHEET_SIZES = {
    "enemies/animations/enemy-kornkrabbler-run.png": (1024, 1024),
    "enemies/animations/enemy-runner-run.png": (1024, 1024),
    "enemies/animations/enemy-elite-runner-run.png": (1024, 1024),
    "enemies/animations/enemy-brute-run.png": (1024, 1024),
    "enemies/animations/enemy-boss-run.png": (1024, 1024),
    "enemies/animations/enemy-support-run.png": (1024, 1024),
    "enemies/animations/enemy-summoner-run.png": (1024, 1024),
    "enemies/animations/enemy-spitter-run.png": (1024, 1024),
    "enemies/animations/enemy-fan-spitter-run.png": (1024, 1024),
    "enemies/animations/enemy-bomber-run.png": (1024, 1024),
    "enemies/animations/enemy-elite-spitter-run.png": (1024, 1024),
}

BULK_1_ICONS = (
    "evo-sunshot-array-icon.png",
    "evo-siegebreaker-shell-icon.png",
    "evo-tempest-crown-icon.png",
    "evo-solar-scramble-icon.png",
    "evo-phoenix-pan-icon.png",
    "evo-broodstorm-icon.png",
)

BULK_2_ICONS = (
    "evo-thunder-roost-icon.png",
    "evo-shell-halo-icon.png",
    "evo-singularity-nest-icon.png",
    "evo-dawn-laser-icon.png",
    "evo-chick-squadron-icon.png",
)


def target_for(relative_source):
    return (RUNTIME_ROOT / relative_source).with_suffix(".webp")


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def fit_visible(image, size, margin):
    image = image.convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if bounds:
        image = image.crop(bounds)
    max_size = (max(1, size[0] - margin * 2), max(1, size[1] - margin * 2))
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def build_ui_icon_sheet():
    sheet_path = SOURCE_ROOT / "ui" / "ui-icons-v1-sheet.png"
    with Image.open(sheet_path) as current:
        base = current.convert("RGBA").crop((0, 0, 768, 768))
    sheet = Image.new("RGBA", (768, 1024), (0, 0, 0, 0))
    sheet.alpha_composite(base, (0, 0))
    for index, filename in enumerate(BULK_1_ICONS):
        with Image.open(SOURCE_ROOT / "ui" / "evolutions" / filename) as icon:
            fitted = fit_visible(icon, (128, 128), 4)
        sheet.alpha_composite(fitted, (index * 128, 768))
    for index, filename in enumerate(BULK_2_ICONS):
        with Image.open(SOURCE_ROOT / "ui" / "evolutions" / filename) as icon:
            fitted = fit_visible(icon, (128, 128), 4)
        sheet.alpha_composite(fitted, (index * 128, 896))
    sheet.save(sheet_path, "PNG", optimize=True)


def optimize_assets():
    build_ui_icon_sheet()
    source_bytes = 0
    runtime_bytes = 0
    manifest_assets = []
    for relative_name in RUNTIME_IMAGES:
        source = SOURCE_ROOT / relative_name
        target = target_for(relative_name)
        if not source.exists():
            raise SystemExit(f"Missing source asset: {source.relative_to(PROJECT_ROOT)}")
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as source_image:
            if relative_name in RUNTIME_SHEET_SIZES:
                image = source_image.convert("RGBA").resize(
                    RUNTIME_SHEET_SIZES[relative_name], Image.Resampling.LANCZOS
                )
            elif relative_name in RUNTIME_SIZES:
                margin = 10 if relative_name.startswith("fx/") else 2
                image = fit_visible(source_image, RUNTIME_SIZES[relative_name], margin)
            else:
                image = source_image.convert("RGBA")
            width, height = image.size
            image.save(target, "WEBP", quality=88, method=6, alpha_quality=100)
        source_bytes += source.stat().st_size
        runtime_bytes += target.stat().st_size
        manifest_assets.append({
            "source": source.relative_to(PROJECT_ROOT).as_posix(),
            "sourceSha256": digest(source),
            "runtime": target.relative_to(PROJECT_ROOT).as_posix(),
            "runtimeSha256": digest(target),
            "width": width,
            "height": height,
            "bytes": target.stat().st_size,
        })
        print(f"{source.relative_to(PROJECT_ROOT)} -> {target.relative_to(PROJECT_ROOT)}")
    MANIFEST_PATH.write_text(json.dumps({
        "version": 1,
        "format": "webp",
        "quality": 88,
        "assets": manifest_assets,
    }, indent=2) + "\n", encoding="ascii")
    reduction = 1 - runtime_bytes / source_bytes
    print(f"Runtime images: {source_bytes:,} -> {runtime_bytes:,} bytes ({reduction:.1%} smaller).")


def main():
    parser = ArgumentParser(description="Build optimized Rooster Rage runtime images.")
    parser.parse_args()
    optimize_assets()


if __name__ == "__main__":
    main()
