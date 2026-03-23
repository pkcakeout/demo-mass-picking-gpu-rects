import { BASE_LINE_WIDTH_PX, HOVER_LINE_WIDTH_PX } from "./config.js";
import { createChunkBuffer, createSharedQuad, updateChunkBuffer } from "./buffers.js";
import { createProgram } from "./program.js";
import {
  LINE_FRAGMENT_SHADER,
  LINE_VERTEX_SHADER,
  RECT_FRAGMENT_SHADER,
  RECT_VERTEX_SHADER,
} from "./shaders.js";
import { collectLeafNodes } from "./quadtree.js";

export function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (gl === null) {
    throw new Error("WebGL2 is required for this demo.");
  }

  const sharedQuad = createSharedQuad(gl);
  const program = createProgram(gl, RECT_VERTEX_SHADER, RECT_FRAGMENT_SHADER);
  const lineProgram = createProgram(gl, LINE_VERTEX_SHADER, LINE_FRAGMENT_SHADER);
  const uniforms = {
    cameraCenter: gl.getUniformLocation(program, "uCameraCenter"),
    viewportSize: gl.getUniformLocation(program, "uViewportSize"),
    zoom: gl.getUniformLocation(program, "uZoom"),
    edgeThicknessPx: gl.getUniformLocation(program, "uEdgeThicknessPx"),
    opacity: gl.getUniformLocation(program, "uOpacity"),
  };
  const lineUniforms = {
    cameraCenter: gl.getUniformLocation(lineProgram, "uCameraCenter"),
    viewportSize: gl.getUniformLocation(lineProgram, "uViewportSize"),
    zoom: gl.getUniformLocation(lineProgram, "uZoom"),
    color: gl.getUniformLocation(lineProgram, "uColor"),
  };

  const quadtreeLine = createLineGeometry(gl);
  const quadtreeHighlight = createLineGeometry(gl);

  gl.clearColor(0.02, 0.04, 0.07, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    gl,
    canvas,
    program,
    lineProgram,
    uniforms,
    lineUniforms,
    sharedQuad,
    chunks: [],
    hoverChunk: createChunkBuffer(gl, sharedQuad, new Float32Array(8)),
    hasHover: false,
    quadtreeLine,
    quadtreeHighlight,
    quadtreeLeafScratch: [],
  };
}

export function resizeRenderer(renderer, width, height, dpr) {
  renderer.canvas.width = Math.max(1, Math.floor(width * dpr));
  renderer.canvas.height = Math.max(1, Math.floor(height * dpr));
  renderer.canvas.style.width = `${width}px`;
  renderer.canvas.style.height = `${height}px`;
  renderer.gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height);
}

export function addRendererChunk(renderer, instanceData) {
  const chunk = createChunkBuffer(renderer.gl, renderer.sharedQuad, instanceData);
  renderer.chunks.push(chunk);
  return chunk;
}

export function updateHoverChunk(renderer, rect) {
  if (rect === null) {
    renderer.hasHover = false;
    return;
  }

  const hoverData = new Float32Array([
    rect.centerX,
    rect.centerY,
    rect.halfWidth,
    rect.halfHeight,
    rect.rotation,
    1.0,
    0.98,
    0.86,
  ]);
  updateChunkBuffer(renderer.gl, renderer.hoverChunk, hoverData);
  renderer.hasHover = true;
}

export function renderScene(renderer, camera) {
  const { gl, program, uniforms } = renderer;
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.uniform2f(uniforms.cameraCenter, camera.x, camera.y);
  gl.uniform2f(uniforms.viewportSize, camera.viewportWidth, camera.viewportHeight);
  gl.uniform1f(uniforms.zoom, camera.zoom);

  let drawCalls = 0;
  drawCalls += drawChunkList(gl, renderer, renderer.chunks, BASE_LINE_WIDTH_PX, 0.96);

  if (renderer.hasHover) {
    drawCalls += drawChunkList(gl, renderer, [renderer.hoverChunk], HOVER_LINE_WIDTH_PX, 1.0);
  }

  drawCalls += drawQuadtree(renderer, camera);

  gl.bindVertexArray(null);
  return drawCalls;
}

export function rebuildQuadtreeLines(renderer, quadtree) {
  const leaves = collectLeafNodes(quadtree, renderer.quadtreeLeafScratch);
  const vertices = new Float32Array(leaves.length * 16);
  let offset = 0;

  for (let index = 0; index < leaves.length; index += 1) {
    const node = leaves[index];
    const minX = node.minX;
    const minY = node.minY;
    const maxX = node.maxX;
    const maxY = node.maxY;

    vertices[offset + 0] = minX;
    vertices[offset + 1] = minY;
    vertices[offset + 2] = maxX;
    vertices[offset + 3] = minY;

    vertices[offset + 4] = maxX;
    vertices[offset + 5] = minY;
    vertices[offset + 6] = maxX;
    vertices[offset + 7] = maxY;

    vertices[offset + 8] = maxX;
    vertices[offset + 9] = maxY;
    vertices[offset + 10] = minX;
    vertices[offset + 11] = maxY;

    vertices[offset + 12] = minX;
    vertices[offset + 13] = maxY;
    vertices[offset + 14] = minX;
    vertices[offset + 15] = minY;
    offset += 16;
  }

  updateLineGeometry(renderer.gl, renderer.quadtreeLine, vertices);
}

export function updateQuadtreeHighlight(renderer, node) {
  if (node === null) {
    updateLineGeometry(renderer.gl, renderer.quadtreeHighlight, new Float32Array(0));
    return;
  }

  const vertices = new Float32Array([
    node.minX, node.minY, node.maxX, node.minY,
    node.maxX, node.minY, node.maxX, node.maxY,
    node.maxX, node.maxY, node.minX, node.maxY,
    node.minX, node.maxY, node.minX, node.minY,
  ]);
  updateLineGeometry(renderer.gl, renderer.quadtreeHighlight, vertices);
}

function drawChunkList(gl, renderer, chunks, edgeThicknessPx, opacity) {
  const { uniforms, sharedQuad } = renderer;
  let drawCalls = 0;

  gl.uniform1f(uniforms.edgeThicknessPx, edgeThicknessPx);
  gl.uniform1f(uniforms.opacity, opacity);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    gl.bindVertexArray(chunk.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, sharedQuad.vertexCount, chunk.rectCount);
    drawCalls += 1;
  }

  return drawCalls;
}

function drawQuadtree(renderer, camera) {
  const { gl, lineProgram, lineUniforms } = renderer;
  let drawCalls = 0;

  gl.useProgram(lineProgram);
  gl.uniform2f(lineUniforms.cameraCenter, camera.x, camera.y);
  gl.uniform2f(lineUniforms.viewportSize, camera.viewportWidth, camera.viewportHeight);
  gl.uniform1f(lineUniforms.zoom, camera.zoom);

  if (renderer.quadtreeLine.vertexCount > 0) {
    gl.bindVertexArray(renderer.quadtreeLine.vao);
    gl.lineWidth(1);
    gl.uniform4f(lineUniforms.color, 0.7, 0.7, 0.72, 0.3);
    gl.drawArrays(gl.LINES, 0, renderer.quadtreeLine.vertexCount);
    drawCalls += 1;
  }

  if (renderer.quadtreeHighlight.vertexCount > 0) {
    gl.bindVertexArray(renderer.quadtreeHighlight.vao);
    gl.lineWidth(2.5);
    gl.uniform4f(lineUniforms.color, 0.92, 0.95, 0.98, 0.9);
    gl.drawArrays(gl.LINES, 0, renderer.quadtreeHighlight.vertexCount);
    drawCalls += 1;
  }

  return drawCalls;
}

function createLineGeometry(gl) {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    vao,
    buffer,
    vertexCount: 0,
  };
}

function updateLineGeometry(gl, geometry, vertices) {
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  geometry.vertexCount = vertices.length / 2;
}