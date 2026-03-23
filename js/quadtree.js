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

export function createQuadtree(bounds, getItemAabb) {
  return {
    root: createNode(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, 0),
    itemCount: 0,
    getItemAabb,
  };
}

export function insertRect(quadtree, rectId, minX, minY, maxX, maxY) {
  quadtree.itemCount += 1;
  insertIntoNode(quadtree, quadtree.root, rectId, minX, minY, maxX, maxY);
}

function insertIntoNode(quadtree, node, rectId, minX, minY, maxX, maxY) {
  if (node.children !== null) {
    insertIntoOverlappingChildren(quadtree, node, rectId, minX, minY, maxX, maxY);
    return;
  }

  node.items.push(rectId);

  if (node.items.length > QUADTREE_SPLIT_THRESHOLD && node.depth < QUADTREE_MAX_DEPTH) {
    splitNode(node);
    const items = node.items;
    node.items = [];
    for (let index = 0; index < items.length; index += 1) {
      const itemId = items[index];
      const itemAabb = quadtree.getItemAabb(itemId);
      insertIntoOverlappingChildren(
        quadtree,
        node,
        itemId,
        itemAabb.minX,
        itemAabb.minY,
        itemAabb.maxX,
        itemAabb.maxY,
      );
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

function insertIntoOverlappingChildren(quadtree, node, rectId, minX, minY, maxX, maxY) {
  for (let index = 0; index < 4; index += 1) {
    const child = node.children[index];
    if (!aabbOverlaps(minX, minY, maxX, maxY, child.minX, child.minY, child.maxX, child.maxY)) {
      continue;
    }

    insertIntoNode(quadtree, child, rectId, minX, minY, maxX, maxY);
  }
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

export function collectLeafNodes(quadtree, output) {
  output.length = 0;
  const stack = [quadtree.root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (node.children === null) {
      output.push(node);
      continue;
    }

    stack.push(node.children[0], node.children[1], node.children[2], node.children[3]);
  }

  return output;
}

export function findDeepestNodeAtPoint(quadtree, x, y) {
  let node = quadtree.root;

  while (node.children !== null) {
    const midX = (node.minX + node.maxX) * 0.5;
    const midY = (node.minY + node.maxY) * 0.5;
    const east = x >= midX ? 1 : 0;
    const north = y >= midY ? 0 : 2;
    node = node.children[north + east];
  }

  return node;
}