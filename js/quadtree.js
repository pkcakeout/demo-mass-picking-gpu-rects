import { QUADTREE_MAX_DEPTH, QUADTREE_SPLIT_THRESHOLD } from "./config.js";
import { aabbOverlaps } from "./math.js";

function createNode(minX, minY, maxX, maxY, depth) {
  return {
    minX,
    minY,
    maxX,
    maxY,
    depth,
    items: [],
    children: null,
  };
}

export function createQuadtree(bounds, getItemCenter) {
  return {
    root: createNode(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, 0),
    itemCount: 0,
    getItemCenter,
  };
}

export function insertRect(quadtree, rectId, centerX, centerY) {
  quadtree.itemCount += 1;
  insertIntoNode(quadtree, quadtree.root, rectId, centerX, centerY);
}

function insertIntoNode(quadtree, node, rectId, centerX, centerY) {
  if (node.children !== null) {
    const child = pickChild(node, centerX, centerY);
    insertIntoNode(quadtree, child, rectId, centerX, centerY);
    return;
  }

  node.items.push(rectId);

  if (node.items.length > QUADTREE_SPLIT_THRESHOLD && node.depth < QUADTREE_MAX_DEPTH) {
    splitNode(node);
    const items = node.items;
    node.items = [];
    for (let index = 0; index < items.length; index += 1) {
      const itemId = items[index];
      const itemCenter = quadtree.getItemCenter(itemId);
      const child = pickChild(node, itemCenter.x, itemCenter.y);
      insertIntoNode(quadtree, child, itemId, itemCenter.x, itemCenter.y);
    }
  }
}

function splitNode(node) {
  const midX = (node.minX + node.maxX) * 0.5;
  const midY = (node.minY + node.maxY) * 0.5;
  const depth = node.depth + 1;

  node.children = [
    createNode(node.minX, midY, midX, node.maxY, depth),
    createNode(midX, midY, node.maxX, node.maxY, depth),
    createNode(node.minX, node.minY, midX, midY, depth),
    createNode(midX, node.minY, node.maxX, midY, depth),
  ];
}

function pickChild(node, centerX, centerY) {
  const midX = (node.minX + node.maxX) * 0.5;
  const midY = (node.minY + node.maxY) * 0.5;
  const east = centerX >= midX ? 1 : 0;
  const north = centerY >= midY ? 0 : 2;
  return node.children[north + east];
}

export function queryRange(quadtree, range, output) {
  output.length = 0;
  const stack = [quadtree.root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!aabbOverlaps(node.minX, node.minY, node.maxX, node.maxY, range.minX, range.minY, range.maxX, range.maxY)) {
      continue;
    }

    if (node.children !== null) {
      stack.push(node.children[0], node.children[1], node.children[2], node.children[3]);
      continue;
    }

    for (let index = 0; index < node.items.length; index += 1) {
      output.push(node.items[index]);
    }
  }

  return output;
}