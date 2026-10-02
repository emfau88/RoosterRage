import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  const aceVersion = (process.env.VITE_ACE_VISUAL_VERSION ?? loadEnv(mode, projectRoot, 'VITE_').VITE_ACE_VISUAL_VERSION) === 'final' ? 'final' : 'mascot';
  const pagesBuild = mode === 'pages';
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
