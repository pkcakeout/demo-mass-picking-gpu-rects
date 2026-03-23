const INSTANCE_STRIDE_FLOATS = 8;
const INSTANCE_STRIDE_BYTES = INSTANCE_STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT;

export function getInstanceStrideBytes() {
  return INSTANCE_STRIDE_BYTES;
}

export function createSharedQuad(gl) {
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  const corners = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, buffer, vertexCount: 6 };
}

export function createChunkBuffer(gl, sharedQuad, instanceData) {
  const vao = gl.createVertexArray();
  const instanceBuffer = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, sharedQuad.buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, INSTANCE_STRIDE_BYTES, 0);
  gl.vertexAttribDivisor(1, 1);

  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, INSTANCE_STRIDE_BYTES, 8);
  gl.vertexAttribDivisor(2, 1);

  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 1, gl.FLOAT, false, INSTANCE_STRIDE_BYTES, 16);
  gl.vertexAttribDivisor(3, 1);

  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 3, gl.FLOAT, false, INSTANCE_STRIDE_BYTES, 20);
  gl.vertexAttribDivisor(4, 1);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return {
    vao,
    buffer: instanceBuffer,
    rectCount: instanceData.length / INSTANCE_STRIDE_FLOATS,
    instanceData,
  };
}

export function updateChunkBuffer(gl, chunk, instanceData) {
  gl.bindBuffer(gl.ARRAY_BUFFER, chunk.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  chunk.rectCount = instanceData.length / INSTANCE_STRIDE_FLOATS;
}