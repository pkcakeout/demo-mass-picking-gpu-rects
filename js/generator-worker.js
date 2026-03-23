import {
  CHUNK_RECT_COUNT,
  COLORS,
  INITIAL_CHUNK_RECT_COUNT,
  TOTAL_RECT_COUNT,
  WORLD_EXTENT,
} from "./config.js";

const FLOATS_PER_RECT = 8;

self.addEventListener("message", (event) => {
  if (event.data?.type !== "start") {
    return;
  }

  generateRectangles(event.data.totalRectangles ?? TOTAL_RECT_COUNT);
});

function generateRectangles(totalRectangles) {
  const random = createMulberry32(0x5eed5eed);
  const clusterCount = 4 + Math.floor(random() * 5);
  const clusters = [];

  for (let index = 0; index < clusterCount; index += 1) {
    clusters.push({
      x: (random() * 2 - 1) * WORLD_EXTENT * 0.75,
      y: (random() * 2 - 1) * WORLD_EXTENT * 0.75,
      spreadX: 280 + random() * 1700,
      spreadY: 280 + random() * 1700,
      weight: 0.5 + random() * 2.5,
      color: COLORS[index % COLORS.length],
    });
  }

  const totalWeight = clusters.reduce((sum, cluster) => sum + cluster.weight, 0);
  for (let index = 0; index < clusters.length; index += 1) {
    clusters[index].normalizedWeight = clusters[index].weight / totalWeight;
  }

  let generated = 0;
  let chunkIndex = 0;

  while (generated < totalRectangles) {
    const rectCount = Math.min(
      generated === 0 ? INITIAL_CHUNK_RECT_COUNT : CHUNK_RECT_COUNT,
      totalRectangles - generated,
    );
    const data = new Float32Array(rectCount * FLOATS_PER_RECT);

    for (let rectIndex = 0; rectIndex < rectCount; rectIndex += 1) {
      const cluster = chooseCluster(clusters, random());
      const centerX = cluster.x + gaussian(random) * cluster.spreadX;
      const centerY = cluster.y + gaussian(random) * cluster.spreadY;
      const halfWidth = 0.4 + Math.pow(random(), 4) * 2.8;
      const halfHeight = 0.4 + Math.pow(random(), 4) * 2.8;
      const rotation = random() * Math.PI;
      const offset = rectIndex * FLOATS_PER_RECT;

      data[offset + 0] = centerX;
      data[offset + 1] = centerY;
      data[offset + 2] = halfWidth;
      data[offset + 3] = halfHeight;
      data[offset + 4] = rotation;
      data[offset + 5] = cluster.color[0];
      data[offset + 6] = cluster.color[1];
      data[offset + 7] = cluster.color[2];
    }

    self.postMessage({
      type: "chunk",
      chunkIndex,
      startIndex: generated,
      rectCount,
      totalRectangles,
      clusters: clusterCount,
      data,
    }, [data.buffer]);

    generated += rectCount;
    chunkIndex += 1;
  }

  self.postMessage({ type: "complete", totalRectangles, chunkCount: chunkIndex });
}

function chooseCluster(clusters, value) {
  let remaining = value;
  for (let index = 0; index < clusters.length; index += 1) {
    remaining -= clusters[index].normalizedWeight;
    if (remaining <= 0) {
      return clusters[index];
    }
  }

  return clusters[clusters.length - 1];
}

function gaussian(random) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function createMulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}