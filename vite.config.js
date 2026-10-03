import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const classicFeedbackArt = (process.env.VITE_PORTAL_FEEDBACK_ART ?? loadEnv(mode, projectRoot, 'VITE_').VITE_PORTAL_FEEDBACK_ART) === 'classic';
  const classicEliteArt = (process.env.VITE_PORTAL_ELITE_ART ?? loadEnv(mode, projectRoot, 'VITE_').VITE_PORTAL_ELITE_ART) === 'classic';
  const aceVersion = (process.env.VITE_ACE_VISUAL_VERSION ?? loadEnv(mode, projectRoot, 'VITE_').VITE_ACE_VISUAL_VERSION) === 'final' ? 'final' : 'mascot';
  const pagesBuild = mode === 'pages';
  const artilleryVersion = (process.env.VITE_ARTILLERY_VISUAL_VERSION ?? loadEnv(mode, projectRoot, 'VITE_').VITE_ARTILLERY_VISUAL_VERSION) === 'final' ? 'final' : 'mascot';
  const stormVersion = (process.env.VITE_STORM_VISUAL_VERSION ?? loadEnv(mode, projectRoot, 'VITE_').VITE_STORM_VISUAL_VERSION) === 'final' ? 'Final' : 'Mascot';
  const standaloneBuild = mode === 'standalone';
  const releaseBuild = mode === 'release';
  const gameOnlyBuild = standaloneBuild || releaseBuild;
  const outputDirectory = pagesBuild
    ? 'dist-pages'
    : standaloneBuild
      ? 'dist-standalone'
      : releaseBuild ? 'dist-release' : 'dist';

  return {
    base: pagesBuild ? '/RoosterRage/' : './',
    publicDir: gameOnlyBuild ? false : 'public',
    plugins: gameOnlyBuild ? [{
      name: 'strip-store-metadata-from-game-package',
      transformIndexHtml(html) {
        return html.replace(/\s*<meta property="og:image"[^>]*>/, '');
      }
    }] : [],
    resolve: {
      alias: {
        '@portal-elite-runner': path.resolve(projectRoot, classicFeedbackArt ? 'src/assets/enemies/animations/enemy-elite-runner-run.webp' : 'src/assets/enemies/portal-v1/enemy-turbo-goose-run.webp'),
        '@portal-elite-tank-run': path.resolve(projectRoot, classicEliteArt ? 'src/assets/enemies/animations/enemy-brute-run.webp' : 'src/assets/enemies/portal-v2/enemy-tank-run.webp'),
        '@portal-elite-tank-actions': path.resolve(projectRoot, classicEliteArt ? 'src/assets/enemies/animations/enemy-elite-brute-stomp.webp' : 'src/assets/enemies/portal-v2/enemy-tank-actions.webp'),
        '@portal-elite-chili-run': path.resolve(projectRoot, classicEliteArt ? 'src/assets/enemies/animations/enemy-elite-spitter-run.webp' : 'src/assets/enemies/portal-v2/enemy-chili-run.webp'),
        '@portal-elite-chili-actions': path.resolve(projectRoot, classicEliteArt ? 'src/assets/enemies/animations/enemy-elite-spitter-pulse.webp' : 'src/assets/enemies/portal-v2/enemy-chili-actions.webp'),
        ...Object.fromEntries(['heal','bomb','magnet'].map(kind => [`@portal-pickup-${kind}`, path.resolve(projectRoot, classicFeedbackArt
          ? `src/assets/ui/stickers/pickup-${kind}-sticker-v2.webp` : `src/assets/pickups/portal-v1/pickup-${kind}.webp`)])),
        ...Object.fromEntries(['ace','storm','artillery'].map(id => [`@portal-portrait-${id}`, path.resolve(projectRoot, classicFeedbackArt
          ? `src/assets/characters/rooster-${id}-portrait.webp` : `src/assets/characters/portraits-mascot/rooster-${id}-portrait.webp`)])),
        '@artillery-production-walk': path.resolve(projectRoot, `src/assets/characters/artillery-${artilleryVersion}/rooster-artillery-${artilleryVersion}-walk.webp`),
        '@artillery-production-idle': path.resolve(projectRoot, `src/assets/characters/artillery-${artilleryVersion}/rooster-artillery-${artilleryVersion}-idle.webp`),
        '@storm-production-assets': path.resolve(projectRoot, `src/systems/assets/storm${stormVersion}Assets.js`),
        '@ace-production-walk': path.resolve(projectRoot, `src/assets/characters/ace-${aceVersion}/rooster-ace-${aceVersion}-walk.webp`),
        '@ace-production-idle': path.resolve(projectRoot, `src/assets/characters/ace-${aceVersion}/rooster-ace-${aceVersion}-idle.webp`),
        '@rooster-assets': path.resolve(
          projectRoot,
          command === 'build'
            ? 'src/systems/assets/roosterAssetUrls.release.js'
            : 'src/systems/assets/roosterAssetUrls.dev.js'
        )
      }
    },
    build: {
      outDir: outputDirectory,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'phaser',
                test: /node_modules[\\/]phaser/
              }
            ]
          }
        }
      }
    }
  };
});
