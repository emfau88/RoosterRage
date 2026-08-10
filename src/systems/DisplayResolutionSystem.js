import Phaser from 'phaser';

const MAX_RENDER_SCALE = 2;
const MAX_RENDER_PIXELS = 4_000_000;

function roundRenderScale(value) {
  return Math.max(1, Math.floor(value * 4) / 4);
}

export function calculateRenderScale(width, height, devicePixelRatio = 1) {
  const viewportPixels = Math.max(1, width * height);
  const safeDevicePixelRatio = Number.isFinite(devicePixelRatio)
    ? Math.max(1, devicePixelRatio)
    : 1;
  const pixelBudgetScale = Math.sqrt(MAX_RENDER_PIXELS / viewportPixels);
  return roundRenderScale(Math.min(
    MAX_RENDER_SCALE,
    safeDevicePixelRatio,
    pixelBudgetScale
  ));
}

export function getViewportSize(view = window) {
  return {
    width: Math.max(1, Math.round(view.innerWidth)),
    height: Math.max(1, Math.round(view.innerHeight))
  };
}

export function createDisplayMetrics(view = window, renderScale) {
  const viewport = getViewportSize(view);
  const resolvedRenderScale = renderScale ?? calculateRenderScale(
    viewport.width,
    viewport.height,
    view.devicePixelRatio
  );
  return {
    ...viewport,
    renderScale: resolvedRenderScale,
    renderWidth: Math.round(viewport.width * resolvedRenderScale),
    renderHeight: Math.round(viewport.height * resolvedRenderScale)
  };
}

function publishDisplayMetrics(game, metrics) {
  game.roosterDisplay = metrics;
  document.body.dataset.renderScale = String(metrics.renderScale);
  document.body.dataset.renderSize = `${metrics.renderWidth}x${metrics.renderHeight}`;
}

export function installDisplayResolution(game, initialMetrics, view = window) {
  const renderScale = initialMetrics.renderScale;
  let scheduledFrame = null;

  const resize = () => {
    scheduledFrame = null;
    const metrics = createDisplayMetrics(view, renderScale);
    publishDisplayMetrics(game, metrics);
    if (
      game.scale.width !== metrics.renderWidth
      || game.scale.height !== metrics.renderHeight
    ) {
      game.scale.resize(metrics.renderWidth, metrics.renderHeight);
    }
  };

  const scheduleResize = () => {
    if (scheduledFrame !== null) {
      return;
    }
    scheduledFrame = view.requestAnimationFrame(resize);
  };

  publishDisplayMetrics(game, initialMetrics);
  view.addEventListener('resize', scheduleResize);
  view.visualViewport?.addEventListener('resize', scheduleResize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    view.removeEventListener('resize', scheduleResize);
    view.visualViewport?.removeEventListener('resize', scheduleResize);
    if (scheduledFrame !== null) {
      view.cancelAnimationFrame(scheduledFrame);
    }
  });
}

export function getSceneRenderScale(scene) {
  return scene.game.roosterDisplay?.renderScale ?? 1;
}

export function getSceneViewport(scene) {
  const display = scene.game.roosterDisplay;
  if (display) {
    return { width: display.width, height: display.height };
  }
  return { width: scene.scale.width, height: scene.scale.height };
}
