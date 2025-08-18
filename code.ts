import { modelJson, modelWeights } from './embedded-model';

figma.showUI(__html__);
figma.ui.resize(250, 150);

figma.ui.postMessage({
  type: 'load-model',
  modelJson,
  modelWeights,
});

figma.ui.onmessage = (msg) => {
  if (msg.type !== 'apply-layout') return;

  const selection = figma.currentPage.selection;
  if (selection.length === 0) return;

  const parent = selection[0].parent;
  if (!parent || !('width' in parent && 'height' in parent)) {
    figma.notify('Parent frame not found', { error: true });
    return;
  }

  const FRAME_MARGIN = 16;
  const MARGIN_FACTOR = 0.05; // space between objects

  const availableWidth = parent.width - 2 * FRAME_MARGIN;
  const availableHeight = parent.height - 2 * FRAME_MARGIN;

  // Normalize layout coordinates
  const xs = msg.layout.map((l: number[]) => (l && l[0] != null) ? l[0] : 0);
  const ys = msg.layout.map((l: number[]) => (l && l[1] != null) ? l[1] : 0);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const placedRects: { x: number; y: number; width: number; height: number }[] = [];

  for (let i = 0; i < selection.length; i++) {
    const layer = selection[i];
    const layout = msg.layout[i] || [0, 0];

    let normX = (layout[0] != null) ? layout[0] : 0;
    let normY = (layout[1] != null) ? layout[1] : 0;

    if (maxX > minX) normX = (normX - minX) / (maxX - minX);
    else normX = 0.5;
    if (maxY > minY) normY = (normY - minY) / (maxY - minY);
    else normY = 0.5;

    const objWidth = layer.width;
    const objHeight = layer.height;

    let x = FRAME_MARGIN + normX * (availableWidth - objWidth);
    let y = FRAME_MARGIN + normY * (availableHeight - objHeight);

    const marginX = objWidth * MARGIN_FACTOR;
    const marginY = objHeight * MARGIN_FACTOR;

    // Grid-based overlap resolution
    const stepX = Math.max(10, marginX);
    const stepY = Math.max(10, marginY);
    let placed = false;

    for (let dx = 0; dx <= availableWidth; dx += stepX) {
      if (placed) break;
      for (let dy = 0; dy <= availableHeight; dy += stepY) {
        const testX = Math.min(Math.max(x + dx, FRAME_MARGIN), parent.width - objWidth - FRAME_MARGIN);
        const testY = Math.min(Math.max(y + dy, FRAME_MARGIN), parent.height - objHeight - FRAME_MARGIN);

        let overlap = false;
        for (const rect of placedRects) {
          if (
            testX < rect.x + rect.width + marginX &&
            testX + objWidth + marginX > rect.x &&
            testY < rect.y + rect.height + marginY &&
            testY + objHeight + marginY > rect.y
          ) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          x = testX;
          y = testY;
          placed = true;
          break;
        }
      }
    }

    layer.x = x;
    layer.y = y;

    placedRects.push({ x, y, width: objWidth, height: objHeight });
  }
};
