import { CAMERA_ZOOM_RATE, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM } from "./config.js";
import { clamp } from "./math.js";

export function createCamera() {
  return {
    x: 0,
    y: 0,
    zoom: INITIAL_ZOOM,
    viewportWidth: 1,
    viewportHeight: 1,
    dpr: 1,
  };
}

export function updateCameraViewport(camera, width, height, dpr) {
  camera.viewportWidth = width;
  camera.viewportHeight = height;
  camera.dpr = dpr;
}

export function screenToWorld(camera, cssX, cssY) {
  const worldX = (cssX - camera.viewportWidth * 0.5) / camera.zoom + camera.x;
  const worldY = (camera.viewportHeight * 0.5 - cssY) / camera.zoom + camera.y;
  return { x: worldX, y: worldY };
}

export function panCamera(camera, deltaCssX, deltaCssY) {
  camera.x -= deltaCssX / camera.zoom;
  camera.y += deltaCssY / camera.zoom;
}

export function zoomCameraAt(camera, cssX, cssY, deltaY) {
  const before = screenToWorld(camera, cssX, cssY);
  const nextZoom = clamp(camera.zoom * Math.exp(-deltaY * CAMERA_ZOOM_RATE), MIN_ZOOM, MAX_ZOOM);
  camera.zoom = nextZoom;
  const after = screenToWorld(camera, cssX, cssY);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
}

export function getWorldPixelSize(camera) {
  return 1 / camera.zoom;
}