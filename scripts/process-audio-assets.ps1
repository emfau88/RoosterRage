param(
  [string]$SourceRoot = 'C:\Users\madde\Documents\ROOSTER\SOUNDS'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = Join-Path $projectRoot 'src\assets\audio'
$auditRoot = Join-Path $projectRoot '.tmp-audio-audit'
$kenneyRoot = Join-Path $auditRoot 'kenney'

function Ensure-Directory([string]$Path) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Convert-Audio {
  param(
    [Parameter(Mandatory)][string]$InputPath,
    [Parameter(Mandatory)][string]$OutputPath,
    [double]$Start = 0,
    [double]$Duration = 0,
    [string]$Filter = 'anull',
    [int]$Channels = 1,
    [int]$Quality = 4
  )
  Ensure-Directory (Split-Path -Parent $OutputPath)
  $arguments = @('-y', '-hide_banner', '-loglevel', 'error')
  if ($Start -gt 0) { $arguments += @('-ss', $Start.ToString([Globalization.CultureInfo]::InvariantCulture)) }
  $arguments += @('-i', $InputPath)
  if ($Duration -gt 0) { $arguments += @('-t', $Duration.ToString([Globalization.CultureInfo]::InvariantCulture)) }
  $arguments += @(
    '-af', "$Filter,aresample=44100",
    '-ac', $Channels,
    '-codec:a', 'libmp3lame',
    '-q:a', $Quality,
    $OutputPath
  )
  & ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $OutputPath" }
}

function Source([string]$Name) {
  return Join-Path $SourceRoot $Name
}

Ensure-Directory $outputRoot
Ensure-Directory $kenneyRoot
tar -xf (Source 'kenney_interfaceSounds.zip') -C $kenneyRoot

$shortPolish = 'highpass=f=90,lowpass=f=15000,loudnorm=I=-18:TP=-1.5:LRA=7'
$softPolish = 'highpass=f=120,lowpass=f=12000,loudnorm=I=-21:TP=-2:LRA=7'
$heavyPolish = 'highpass=f=45,lowpass=f=14000,loudnorm=I=-16:TP=-1.2:LRA=8'

# Egg identity and rooster primaries.
$eggCracks = Source '843345__loganzsound__egg-cracks.wav'
Convert-Audio $eggCracks (Join-Path $outputRoot 'sfx\weapons\egg-impact-1.mp3') 0 0.48 "$shortPolish,afade=t=out:st=0.42:d=0.05"
Convert-Audio $eggCracks (Join-Path $outputRoot 'sfx\weapons\egg-impact-2.mp3') 1.08 0.34 "$shortPolish,afade=t=out:st=0.29:d=0.04"
Convert-Audio $eggCracks (Join-Path $outputRoot 'sfx\weapons\egg-impact-3.mp3') 3.49 0.29 "$shortPolish,afade=t=out:st=0.24:d=0.04"
Convert-Audio $eggCracks (Join-Path $outputRoot 'sfx\weapons\egg-impact-4.mp3') 4.54 0.20 "$shortPolish,afade=t=out:st=0.16:d=0.03"
Convert-Audio (Source '447806__florianreichelt__light-wooshes.wav') (Join-Path $outputRoot 'sfx\weapons\egg-launch-ace.mp3') 10.04 0.66 "atempo=1.8,$softPolish,afade=t=out:st=0.31:d=0.05"
Convert-Audio (Source '267887__wjl__short-fireball-woosh.flac') (Join-Path $outputRoot 'sfx\weapons\egg-launch-artillery.mp3') 0 0.82 "asetrate=48000*0.88,aresample=44100,atempo=1.25,$heavyPolish,afade=t=out:st=0.66:d=0.08"
Convert-Audio (Source '512471__michael_grinnell__electric-zap.wav') (Join-Path $outputRoot 'sfx\weapons\egg-launch-storm.mp3') 0 0.22 "$shortPolish,afade=t=out:st=0.18:d=0.03"

# Player and chicken character accents.
Convert-Audio (Source '316920__rudmer_rotteveel__chicken-single-alarm-call.wav') (Join-Path $outputRoot 'sfx\player\player-hurt.mp3') 0 0.82 "highpass=f=180,lowpass=f=10000,loudnorm=I=-17:TP=-1.5:LRA=7,afade=t=out:st=0.72:d=0.08"
Convert-Audio (Source '43381__agfx__rooster-chicken-calls_1.wav') (Join-Path $outputRoot 'sfx\player\rooster-crow.mp3') 0 2.48 "highpass=f=120,lowpass=f=12000,loudnorm=I=-19:TP=-1.8:LRA=8,afade=t=out:st=2.30:d=0.16"
Convert-Audio (Source '596521__eugeneeverett__wings-flapping.wav') (Join-Path $outputRoot 'sfx\player\support-flap.mp3') 0 1.24 "$softPolish,afade=t=out:st=1.08:d=0.12"
Convert-Audio (Source '562292__colorscrimsontears__heal-rpg.wav') (Join-Path $outputRoot 'sfx\player\second-wind.mp3') 0 1.18 "asetrate=96000*0.94,aresample=44100,$shortPolish,afade=t=out:st=1.04:d=0.10"

# Rewards, chest and pickups.
Convert-Audio (Source 'gem-gather-stereo.wav') (Join-Path $outputRoot 'sfx\rewards\xp-pickup.mp3') 0 0.19 "highpass=f=500,lowpass=f=12000,loudnorm=I=-24:TP=-4:LRA=6"
Convert-Audio (Source 'UISoundEffects\Level Up.mp3') (Join-Path $outputRoot 'sfx\rewards\level-up.mp3') 0 2.8 "highpass=f=90,loudnorm=I=-17:TP=-1.5:LRA=8,afade=t=out:st=2.55:d=0.2" 2
Convert-Audio (Source 'UISoundEffects\Ability Learn.mp3') (Join-Path $outputRoot 'sfx\rewards\evolution.mp3') 0 3.1 "highpass=f=80,loudnorm=I=-15:TP=-1.2:LRA=9,afade=t=out:st=2.82:d=0.24" 2
Convert-Audio (Join-Path $kenneyRoot 'Audio\confirmation_001.ogg') (Join-Path $outputRoot 'sfx\rewards\upgrade-select.mp3') 0 0.29 "$shortPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\pluck_002.ogg') (Join-Path $outputRoot 'sfx\rewards\chest-spawn.mp3') 0 0.62 "$softPolish"
Convert-Audio (Source '573653__the_frisbee_of_peace__wooden-chest-lid-latches-open.wav') (Join-Path $outputRoot 'sfx\rewards\chest-latch.mp3') 0.14 1.03 "$shortPolish,afade=t=out:st=0.92:d=0.08"
Convert-Audio (Source '573654__the_frisbee_of_peace__wooden-chest-open.wav') (Join-Path $outputRoot 'sfx\rewards\chest-open.mp3') 0 1.48 "$heavyPolish,afade=t=out:st=1.30:d=0.14"
Convert-Audio (Source 'UISoundEffects\Item Pickup.mp3') (Join-Path $outputRoot 'sfx\rewards\chest-reward.mp3') 0 0.68 "$shortPolish" 2
Convert-Audio (Source '562292__colorscrimsontears__heal-rpg.wav') (Join-Path $outputRoot 'sfx\rewards\pickup-heal.mp3') 0 1.18 "$shortPolish,afade=t=out:st=1.04:d=0.10"
Convert-Audio (Source '577961__colorscrimsontears__apply-rpg.wav') (Join-Path $outputRoot 'sfx\rewards\pickup-magnet.mp3') 0 1.02 "$softPolish,afade=t=out:st=0.90:d=0.09"
Convert-Audio (Source '431174__blankened__fireball-explosion.wav') (Join-Path $outputRoot 'sfx\rewards\pickup-bomb.mp3') 0 1.04 "asetrate=44100*0.86,aresample=44100,$heavyPolish,afade=t=out:st=0.94:d=0.08"
Convert-Audio (Source 'Oldschool Intro.mp3') (Join-Path $outputRoot 'sfx\rewards\victory.mp3') 0 4.8 "highpass=f=55,loudnorm=I=-15:TP=-1.2:LRA=9,afade=t=out:st=4.35:d=0.4" 2

# Compact UI family.
Convert-Audio (Join-Path $kenneyRoot 'Audio\select_003.ogg') (Join-Path $outputRoot 'ui\ui-navigate.mp3') 0 0.38 "atempo=1.65,$softPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\confirmation_001.ogg') (Join-Path $outputRoot 'ui\ui-confirm.mp3') 0 0.29 "$shortPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\back_003.ogg') (Join-Path $outputRoot 'ui\ui-back.mp3') 0 0.09 "$softPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\error_007.ogg') (Join-Path $outputRoot 'ui\ui-denied.mp3') 0 0.19 "$shortPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\toggle_002.ogg') (Join-Path $outputRoot 'ui\ui-toggle.mp3') 0 0.14 "$softPolish"
Convert-Audio (Join-Path $kenneyRoot 'Audio\open_004.ogg') (Join-Path $outputRoot 'ui\ui-reroll.mp3') 0 0.32 "asetrate=44100*1.08,aresample=44100,$shortPolish"

# Enemy information and boss punctuation.
Convert-Audio (Source '568598__thesoundbandit__spit.wav') (Join-Path $outputRoot 'sfx\enemies\spitter-shot.mp3') 0 1.24 "highpass=f=160,lowpass=f=11000,loudnorm=I=-19:TP=-2:LRA=7,afade=t=out:st=1.08:d=0.12"
Convert-Audio (Source '812538__yoyamen1212__big-monster-stomp.wav') (Join-Path $outputRoot 'sfx\enemies\brute-stomp.mp3') 0.04 1.65 "$heavyPolish,afade=t=out:st=1.46:d=0.16"
Convert-Audio (Source '431174__blankened__fireball-explosion.wav') (Join-Path $outputRoot 'sfx\enemies\bomber-explosion.mp3') 0 1.04 "asetrate=44100*1.12,aresample=44100,$shortPolish,afade=t=out:st=0.92:d=0.08"
Convert-Audio (Source '739444__gammagool__magic-enchantment.wav') (Join-Path $outputRoot 'sfx\enemies\summoner-charge.mp3') 0 2.28 "$softPolish,afade=t=out:st=2.08:d=0.16"
Convert-Audio (Source '563542__colorscrimsontears__teleport-rpg.wav') (Join-Path $outputRoot 'sfx\enemies\summoner-spawn.mp3') 0 1.72 "$shortPolish,afade=t=out:st=1.50:d=0.18"
Convert-Audio (Source '739444__gammagool__magic-enchantment.wav') (Join-Path $outputRoot 'sfx\enemies\elite-entry.mp3') 0.18 1.38 "asetrate=48000*0.92,aresample=44100,$shortPolish,afade=t=out:st=1.22:d=0.12"
Convert-Audio (Source '537883__colorscrimsontears__monster-roar.wav') (Join-Path $outputRoot 'sfx\enemies\boss-roar.mp3') 0 1.76 "$heavyPolish,afade=t=out:st=1.58:d=0.14"
Convert-Audio (Source '739444__gammagool__magic-enchantment.wav') (Join-Path $outputRoot 'sfx\enemies\boss-phase.mp3') 0 2.28 "asetrate=48000*0.84,aresample=44100,$heavyPolish,afade=t=out:st=2.02:d=0.2"
Convert-Audio (Source '267887__wjl__short-fireball-woosh.flac') (Join-Path $outputRoot 'sfx\enemies\boss-fireball.mp3') 0 1.12 "asetrate=48000*0.82,aresample=44100,$heavyPolish,afade=t=out:st=0.98:d=0.10"

# Abilities and environmental props.
Convert-Audio (Source '136542__joelaudio__electric_zap_001.wav') (Join-Path $outputRoot 'sfx\abilities\lightning.mp3') 0 0.74 "$shortPolish,afade=t=out:st=0.64:d=0.08"
Convert-Audio (Source '512471__michael_grinnell__electric-zap.wav') (Join-Path $outputRoot 'sfx\abilities\lightning-chain.mp3') 0 0.22 "$softPolish"
Convert-Audio (Source '431174__blankened__fireball-explosion.wav') (Join-Path $outputRoot 'sfx\abilities\rocket-explosion.mp3') 0 1.06 "$heavyPolish,afade=t=out:st=0.94:d=0.08"
Convert-Audio (Source '267887__wjl__short-fireball-woosh.flac') (Join-Path $outputRoot 'sfx\abilities\rocket-launch.mp3') 0 0.78 "atempo=1.35,$shortPolish,afade=t=out:st=0.52:d=0.06"
Convert-Audio (Source '431174__blankened__fireball-explosion.wav') (Join-Path $outputRoot 'sfx\abilities\molotov-impact.mp3') 0 0.92 "asetrate=44100*1.16,aresample=44100,highpass=f=100,lowpass=f=12000,loudnorm=I=-19:TP=-2:LRA=7,afade=t=out:st=0.80:d=0.08"
Convert-Audio (Source '563542__colorscrimsontears__teleport-rpg.wav') (Join-Path $outputRoot 'sfx\abilities\void-open.mp3') 0 1.72 "$shortPolish,afade=t=out:st=1.50:d=0.18"
Convert-Audio (Join-Path $projectRoot 'src\assets\audio\laser.wav') (Join-Path $outputRoot 'sfx\abilities\laser.mp3') 0 0 "$softPolish"
Convert-Audio (Join-Path $projectRoot 'src\assets\audio\enemy-hit.wav') (Join-Path $outputRoot 'sfx\combat\enemy-hit.mp3') 0 0 "$softPolish"
Convert-Audio (Join-Path $projectRoot 'src\assets\audio\enemy-pop.wav') (Join-Path $outputRoot 'sfx\combat\enemy-pop.mp3') 0 0 "$softPolish"
Convert-Audio (Source '667653__deltacode__wooden-crate-break1.wav') (Join-Path $outputRoot 'sfx\environment\crate-break.mp3') 0 0.65 "$heavyPolish,afade=t=out:st=0.57:d=0.06"
Convert-Audio (Source '667653__deltacode__wooden-crate-break1.wav') (Join-Path $outputRoot 'sfx\environment\bale-break.mp3') 0 0.60 "highpass=f=260,lowpass=f=6500,loudnorm=I=-22:TP=-3:LRA=6,afade=t=out:st=0.52:d=0.06"

# Stable musical flow; ambience is menu-only and intentionally quiet in the runtime mix.
Convert-Audio (Source 'wackywobblings.ogg') (Join-Path $outputRoot 'music\menu-theme.mp3') 0 0 'loudnorm=I=-18:TP=-1.5:LRA=10' 2 5
Convert-Audio (Source 'backfootextended.ogg') (Join-Path $outputRoot 'music\run-theme.mp3') 0 0 'loudnorm=I=-17:TP=-1.5:LRA=10' 2 5
Convert-Audio (Source 'urban_boss_battle_bpm135.mp3') (Join-Path $outputRoot 'music\boss-theme.mp3') 0 0 'loudnorm=I=-16:TP=-1.2:LRA=10' 2 5
Convert-Audio (Source '536693__fthgurdy__chickens-in-the-coop-morning.mp3') (Join-Path $outputRoot 'ambience\menu-coop.mp3') 12 28 "highpass=f=140,lowpass=f=9000,loudnorm=I=-29:TP=-5:LRA=10,afade=t=in:st=0:d=1.2,afade=t=out:st=26.5:d=1.2" 2 6

Write-Output "Processed audio assets written to $outputRoot"
