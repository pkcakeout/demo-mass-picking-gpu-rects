import { BASE_LINE_WIDTH_PX, HOVER_LINE_WIDTH_PX } from "./config.js";
import { createChunkBuffer, createSharedQuad, updateChunkBuffer } from "./buffers.js";
import { createProgram } from "./program.js";
import { RECT_FRAGMENT_SHADER, RECT_VERTEX_SHADER } from "./shaders.js";

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
  const uniforms = {
    cameraCenter: gl.getUniformLocation(program, "uCameraCenter"),
    viewportSize: gl.getUniformLocation(program, "uViewportSize"),
    zoom: gl.getUniformLocation(program, "uZoom"),
    edgeThicknessPx: gl.getUniformLocation(program, "uEdgeThicknessPx"),
    opacity: gl.getUniformLocation(program, "uOpacity"),
  };

  gl.clearColor(0.02, 0.04, 0.07, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    gl,
    canvas,
    program,
    uniforms,
    sharedQuad,
    chunks: [],
    hoverChunk: createChunkBuffer(gl, sharedQuad, new Float32Array(8)),
    hasHover: false,
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
  const { gl, canvas, program, uniforms } = renderer;
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

  gl.bindVertexArray(null);
  return drawCalls;
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