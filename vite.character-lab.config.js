import { mergeConfig } from 'vite';
import gameConfig from './vite.config.js';

// Separate verification build. The default release entry and assets stay intact.
export default mergeConfig(gameConfig, {
  build: {
    outDir: 'test-results/character-lab-build',
    rolldownOptions: {
      input: {
        game: 'index.html',
        characterLab: 'character-lab.html',
        acePreview: 'ace-preview.html',
        roosterPreview: 'rooster-preview.html'
      }
    }
  }
});
