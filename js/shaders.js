export const RECT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aCenter;
layout(location = 2) in vec2 aHalfSize;
layout(location = 3) in float aRotation;
layout(location = 4) in vec3 aColor;

uniform vec2 uCameraCenter;
uniform vec2 uViewportSize;
uniform float uZoom;
uniform float uEdgeThicknessPx;

out vec2 vLocalPos;
out vec2 vHalfSize;
out vec3 vColor;
out float vEdgeThicknessWorld;

void main() {
  float c = cos(aRotation);
  float s = sin(aRotation);
  vec2 expandedHalfSize = aHalfSize + vec2(uEdgeThicknessPx / uZoom);
  vec2 local = aCorner * expandedHalfSize;
  vec2 rotated = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  vec2 world = aCenter + rotated;
  vec2 cameraRelative = (world - uCameraCenter) * uZoom;
  vec2 ndc = vec2(
    cameraRelative.x / (uViewportSize.x * 0.5),
    cameraRelative.y / (uViewportSize.y * 0.5)
  );

  gl_Position = vec4(ndc, 0.0, 1.0);
  vLocalPos = local;
  vHalfSize = aHalfSize;
  vColor = aColor;
  vEdgeThicknessWorld = uEdgeThicknessPx / uZoom;
}
`;

export const RECT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vLocalPos;
in vec2 vHalfSize;
in vec3 vColor;
in float vEdgeThicknessWorld;

uniform float uOpacity;

out vec4 outColor;

void main() {
  vec2 edgeDistance = vHalfSize - abs(vLocalPos);
  float nearestEdge = min(edgeDistance.x, edgeDistance.y);
  float feather = max(vEdgeThicknessWorld * 0.45, 0.0001);
  float edgeAlpha = 1.0 - smoothstep(vEdgeThicknessWorld, vEdgeThicknessWorld + feather, nearestEdge);
  float fillAlpha = smoothstep(vEdgeThicknessWorld * 0.5, vEdgeThicknessWorld * 2.0, nearestEdge) * 0.2;
  float alpha = max(edgeAlpha, fillAlpha) * uOpacity;

  if (alpha <= 0.001) {
    discard;
  }

  outColor = vec4(vColor, alpha);
}
`;