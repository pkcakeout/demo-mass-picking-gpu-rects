import {
  OVERLAY_REFRESH_MS,
  PAN_BUTTON,
  TOTAL_RECT_COUNT,
} from "./config.js";
import { createCamera, panCamera, screenToWorld, updateCameraViewport, zoomCameraAt } from "./camera.js";
import { attachDataManagerHandlers, createDataManager, startGeneration } from "./data-manager.js";
import { createOverlay, renderOverlay } from "./overlay.js";
import { createPickingState, pickRectangle } from "./picking.js";
import { addRendererChunk, createRenderer, renderScene, resizeRenderer, updateHoverChunk } from "./renderer.js";

const canvas = document.querySelector("#scene");
const statsElement = document.querySelector("#stats");

const camera = createCamera();
const overlay = createOverlay(statsElement);
const pickingState = createPickingState();
const renderer = createRenderer(canvas);
const dataManager = createDataManager(new URL("./generator-worker.js", import.meta.url));

const state = {
  fps: 0,
  frameCount: 0,
  lastFpsSample: performance.now(),
  drawCalls: 0,
  hoveredId: null,
  firstPaintMs: null,
  status: "loading",
};

let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

attachDataManagerHandlers(dataManager, {
  onChunk: ({ data }) => {
    addRendererChunk(renderer, data);
    if (dataManager.totalChunks < dataManager.loadedChunks) {
      dataManager.totalChunks = dataManager.loadedChunks;
    }
    if (state.firstPaintMs === null) {
      state.firstPaintMs = performance.now() - dataManager.generationStart;
    }
    state.status = dataManager.loadedRectangles >= TOTAL_RECT_COUNT ? "ready" : "streaming";
    if (pickingState.hovered !== null) {
      updateHoverChunk(renderer, pickingState.hovered);
    }
  },
  onComplete: () => {
    state.status = "ready";
  },
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== PAN_BUTTON) {
    return;
  }

  isDragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.classList.add("is-dragging");
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (isDragging) {
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    panCamera(camera, deltaX, deltaY);
  }

  const rect = canvas.getBoundingClientRect();
  const cssX = event.clientX - rect.left;
  const cssY = event.clientY - rect.top;
  const world = screenToWorld(camera, cssX, cssY);
  const hovered = pickRectangle(dataManager, camera, world.x, world.y, pickingState);
  state.hoveredId = hovered?.id ?? null;
  updateHoverChunk(renderer, hovered);
});

canvas.addEventListener("pointerup", (event) => {
  isDragging = false;
  canvas.classList.remove("is-dragging");
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
});

canvas.addEventListener("pointerleave", () => {
  if (!isDragging) {
    state.hoveredId = null;
    pickingState.hovered = null;
    updateHoverChunk(renderer, null);
  }
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  zoomCameraAt(camera, event.clientX - rect.left, event.clientY - rect.top, event.deltaY);
}, { passive: false });

window.addEventListener("resize", handleResize);

handleResize();
startGeneration(dataManager);
requestAnimationFrame(frame);

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  updateCameraViewport(camera, width, height, dpr);
  resizeRenderer(renderer, width, height, dpr);
}

function frame(now) {
  state.frameCount += 1;
  const elapsed = now - state.lastFpsSample;
  if (elapsed >= 500) {
    state.fps = (state.frameCount * 1000) / elapsed;
    state.frameCount = 0;
    state.lastFpsSample = now;
  }

  state.drawCalls = renderScene(renderer, camera);

  renderOverlay(overlay, {
    fps: state.fps,
    loadedRectangles: dataManager.loadedRectangles,
    totalRectangles: dataManager.totalRectangles,
    loadedChunks: dataManager.loadedChunks,
    totalChunks: Math.max(dataManager.totalChunks, dataManager.loadedChunks),
    drawCalls: state.drawCalls,
    zoom: camera.zoom,
    hoveredId: state.hoveredId,
    queryMs: pickingState.queryMs,
    treeBuildMs: dataManager.treeBuildMs,
    generationMs: dataManager.generationEnd === 0
      ? performance.now() - dataManager.generationStart
      : dataManager.generationEnd - dataManager.generationStart,
    firstPaintMs: state.firstPaintMs,
    status: state.status,
  }, now, OVERLAY_REFRESH_MS);

  requestAnimationFrame(frame);
}