import { PICK_THRESHOLD_PX } from "./config.js";
import { getWorldPixelSize } from "./camera.js";
import { aabbOverlaps, pointToRectangleEdgeDistanceSquared } from "./math.js";
import { queryRange } from "./quadtree.js";

export function createPickingState() {
  return {
    hovered: null,
    queryMs: 0,
    candidates: [],
    best: null,
  };
}

export function pickRectangle(dataManager, camera, mouseWorldX, mouseWorldY, scratch) {
  const quadtree = dataManager.quadtree;
  if (quadtree === null) {
    scratch.hovered = null;
    scratch.queryMs = 0;
    return null;
  }

  const start = performance.now();
  const thresholdWorld = PICK_THRESHOLD_PX * getWorldPixelSize(camera);
  const range = {
    minX: mouseWorldX - thresholdWorld,
    minY: mouseWorldY - thresholdWorld,
    maxX: mouseWorldX + thresholdWorld,
    maxY: mouseWorldY + thresholdWorld,
  };
  const candidates = queryRange(quadtree, range, scratch.candidates);
  const thresholdSquared = thresholdWorld * thresholdWorld;

  let best = null;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < candidates.length; index += 1) {
    const rectId = candidates[index];
    const rect = getRectView(dataManager, rectId);
    if (!aabbOverlaps(
      rect.minX - thresholdWorld,
      rect.minY - thresholdWorld,
      rect.maxX + thresholdWorld,
      rect.maxY + thresholdWorld,
      range.minX,
      range.minY,
      range.maxX,
      range.maxY,
    )) {
      continue;
    }

    const distanceSquared = pointToRectangleEdgeDistanceSquared(
      mouseWorldX,
      mouseWorldY,
      rect.centerX,
      rect.centerY,
      rect.halfWidth,
      rect.halfHeight,
      Math.cos(rect.rotation),
      Math.sin(rect.rotation),
    );

    if (distanceSquared <= thresholdSquared && distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      best = rect;
    }
  }

  scratch.hovered = best;
  scratch.queryMs = performance.now() - start;
  return best;
}

function getRectView(dataManager, rectId) {
  const chunkIndex = dataManager.resolveChunkIndex(rectId);
  const chunk = dataManager.chunks[chunkIndex];
  const localIndex = rectId - chunk.startIndex;
  const dataOffset = localIndex * 8;
  const aabbOffset = localIndex * 4;

  return {
    id: rectId,
    chunkIndex,
    chunkOffset: localIndex,
    centerX: chunk.data[dataOffset + 0],
    centerY: chunk.data[dataOffset + 1],
    halfWidth: chunk.data[dataOffset + 2],
    halfHeight: chunk.data[dataOffset + 3],
    rotation: chunk.data[dataOffset + 4],
    minX: chunk.aabbs[aabbOffset + 0],
    minY: chunk.aabbs[aabbOffset + 1],
    maxX: chunk.aabbs[aabbOffset + 2],
    maxY: chunk.aabbs[aabbOffset + 3],
  };
}