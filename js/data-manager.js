import { TOTAL_RECT_COUNT, WORLD_EXTENT } from "./config.js";
import { CHUNK_RECT_COUNT, INITIAL_CHUNK_RECT_COUNT } from "./config.js";
import { computeRotatedAabb } from "./math.js";
import { createQuadtree, insertRect } from "./quadtree.js";

export function createDataManager(workerUrl) {
  const worker = new Worker(workerUrl, { type: "module" });
  const dataManager = {
    worker,
    totalRectangles: TOTAL_RECT_COUNT,
    loadedRectangles: 0,
    totalChunks: 0,
    loadedChunks: 0,
    generationStart: 0,
    generationEnd: 0,
    treeBuildMs: 0,
    chunks: [],
    quadtree: null,
    resolveChunkIndex(rectId) {
      if (rectId < INITIAL_CHUNK_RECT_COUNT) {
        return 0;
      }
      return 1 + Math.floor((rectId - INITIAL_CHUNK_RECT_COUNT) / CHUNK_RECT_COUNT);
    },
  };

  dataManager.quadtree = createQuadtree({
      minX: -WORLD_EXTENT * 2,
      minY: -WORLD_EXTENT * 2,
      maxX: WORLD_EXTENT * 2,
      maxY: WORLD_EXTENT * 2,
    }, (rectId) => getRectAabb(dataManager, rectId));

  return dataManager;
}

export function startGeneration(dataManager) {
  dataManager.generationStart = performance.now();
  dataManager.worker.postMessage({ type: "start", totalRectangles: dataManager.totalRectangles });
}

export function attachDataManagerHandlers(dataManager, handlers) {
  dataManager.worker.addEventListener("message", (event) => {
    const { data } = event;

    if (data.type === "chunk") {
      const buildStart = performance.now();
      const chunk = buildChunkRecord(data.data, data.startIndex, data.chunkIndex);
      dataManager.chunks[data.chunkIndex] = chunk;
      for (let index = 0; index < chunk.rectCount; index += 1) {
        const aabbOffset = index * 4;
        insertRect(
          dataManager.quadtree,
          chunk.startIndex + index,
          chunk.aabbs[aabbOffset + 0],
          chunk.aabbs[aabbOffset + 1],
          chunk.aabbs[aabbOffset + 2],
          chunk.aabbs[aabbOffset + 3],
        );
      }
      dataManager.treeBuildMs += performance.now() - buildStart;
      dataManager.loadedRectangles += data.rectCount;
      dataManager.loadedChunks += 1;
      handlers.onChunk({
        chunkIndex: data.chunkIndex,
        startIndex: data.startIndex,
        rectCount: data.rectCount,
        totalRectangles: data.totalRectangles,
        data: data.data,
        chunk,
      });
      return;
    }

    if (data.type === "complete") {
      dataManager.totalChunks = data.chunkCount;
      dataManager.generationEnd = performance.now();
      handlers.onComplete(data);
    }
  });
}

function buildChunkRecord(instanceData, startIndex, chunkIndex) {
  const rectCount = instanceData.length / 8;
  const aabbs = new Float32Array(rectCount * 4);

  for (let rectIndex = 0; rectIndex < rectCount; rectIndex += 1) {
    const base = rectIndex * 8;
    const aabbBase = rectIndex * 4;
    const aabb = computeRotatedAabb(
      instanceData[base + 0],
      instanceData[base + 1],
      instanceData[base + 2],
      instanceData[base + 3],
      instanceData[base + 4],
    );
    aabbs[aabbBase + 0] = aabb.minX;
    aabbs[aabbBase + 1] = aabb.minY;
    aabbs[aabbBase + 2] = aabb.maxX;
    aabbs[aabbBase + 3] = aabb.maxY;
  }

  return {
    chunkIndex,
    startIndex,
    rectCount,
    data: instanceData,
    aabbs,
  };
}

function getRectAabb(dataManager, rectId) {
  const chunkIndex = dataManager.resolveChunkIndex(rectId);
  const chunk = dataManager.chunks[chunkIndex];
  const localIndex = rectId - chunk.startIndex;
  const aabbOffset = localIndex * 4;

  return {
    minX: chunk.aabbs[aabbOffset + 0],
    minY: chunk.aabbs[aabbOffset + 1],
    maxX: chunk.aabbs[aabbOffset + 2],
    maxY: chunk.aabbs[aabbOffset + 3],
  };
}