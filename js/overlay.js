import { formatNumber } from "./math.js";

export function createOverlay(element) {
  return {
    element,
    lastText: "",
    lastUpdate: 0,
  };
}

export function renderOverlay(overlay, snapshot, now, refreshMs) {
  if (now - overlay.lastUpdate < refreshMs) {
    return;
  }

  const hovered = snapshot.hoveredId === null ? "none" : String(snapshot.hoveredId);
  const loadRatio = snapshot.totalRectangles === 0
    ? 0
    : (snapshot.loadedRectangles / snapshot.totalRectangles) * 100;

  const text = [
    `fps          ${snapshot.fps.toFixed(1)}`,
    `rectangles   ${formatNumber(snapshot.loadedRectangles)} / ${formatNumber(snapshot.totalRectangles)} (${loadRatio.toFixed(1)}%)`,
    `chunks       ${formatNumber(snapshot.loadedChunks)} / ${formatNumber(snapshot.totalChunks)}`,
    `draw calls   ${formatNumber(snapshot.drawCalls)}`,
    `zoom         ${snapshot.zoom.toFixed(3)}x`,
    `hover        ${hovered}`,
    `query ms     ${snapshot.queryMs.toFixed(3)}`,
    `build ms     ${snapshot.treeBuildMs.toFixed(1)}`,
    `gen ms       ${snapshot.generationMs.toFixed(1)}`,
    `first paint  ${snapshot.firstPaintMs === null ? "pending" : `${snapshot.firstPaintMs.toFixed(1)} ms`}`,
    `status       ${snapshot.status}`,
  ].join("\n");

  if (text !== overlay.lastText) {
    overlay.element.textContent = text;
    overlay.lastText = text;
  }

  overlay.lastUpdate = now;
}