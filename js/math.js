export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function computeRotatedAabb(centerX, centerY, halfWidth, halfHeight, rotation) {
  const cosTheta = Math.cos(rotation);
  const sinTheta = Math.sin(rotation);
  const extentX = Math.abs(cosTheta * halfWidth) + Math.abs(sinTheta * halfHeight);
  const extentY = Math.abs(sinTheta * halfWidth) + Math.abs(cosTheta * halfHeight);

  return {
    minX: centerX - extentX,
    minY: centerY - extentY,
    maxX: centerX + extentX,
    maxY: centerY + extentY,
  };
}

export function aabbOverlaps(aMinX, aMinY, aMaxX, aMaxY, bMinX, bMinY, bMaxX, bMaxY) {
  return aMinX <= bMaxX && aMaxX >= bMinX && aMinY <= bMaxY && aMaxY >= bMinY;
}

export function pointToRectangleEdgeDistanceSquared(
  pointX,
  pointY,
  centerX,
  centerY,
  halfWidth,
  halfHeight,
  cosTheta,
  sinTheta,
) {
  const localX = (pointX - centerX) * cosTheta + (pointY - centerY) * sinTheta;
  const localY = -(pointX - centerX) * sinTheta + (pointY - centerY) * cosTheta;

  const dx = Math.abs(localX) - halfWidth;
  const dy = Math.abs(localY) - halfHeight;
  const outsideX = Math.max(dx, 0);
  const outsideY = Math.max(dy, 0);

  if (dx > 0 || dy > 0) {
    return outsideX * outsideX + outsideY * outsideY;
  }

  const distanceToVertical = halfWidth - Math.abs(localX);
  const distanceToHorizontal = halfHeight - Math.abs(localY);
  const minDistance = Math.min(distanceToVertical, distanceToHorizontal);
  return minDistance * minDistance;
}

export function expandAabb(aabb, amount) {
  return {
    minX: aabb.minX - amount,
    minY: aabb.minY - amount,
    maxX: aabb.maxX + amount,
    maxY: aabb.maxY + amount,
  };
}