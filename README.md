# Mass Picking — GPU Rectangles Demo

**This entire repo including this readme was created with CodeGen-AI as a tech demo. Use with caution!**

Live demo: https://pkcakeout.github.io/demo-mass-picking-gpu-rects/

A single-page WebGL2 tech demo with no build step, no npm, and no external dependencies.
It renders 10 million clustered 2D rectangles on a full-window canvas using instanced drawing,
and supports interactive CPU-side edge picking via a quadtree spatial index.

---

## Features

- **10 million rectangles** generated in a background Web Worker and streamed to the GPU in chunks as they are produced, so the scene is interactive well before the full dataset is loaded
- **Clustered layout** — rectangles are distributed across a small random number of 2D Gaussian clusters, each with its own colour
- **WebGL2 instanced rendering** — all geometry is expanded on the GPU from a single shared unit quad; zero per-rectangle draw calls from JavaScript
- **Chunked GPU buffers** — instance data is split across multiple GPU buffers so no single allocation is assumed to fit the full dataset
- **CPU quadtree picking** with AABB overlap insertion (rectangles are indexed into every quadrant sector their bounding box overlaps)
  - Quadrant split threshold: 100 items per node
  - Maximum tree depth: 16
  - On mouse move: AABB quick-reject → rotated-rectangle edge distance → closest edge wins
  - Threshold: 5 pixels in screen space, correctly scaled to world space at any zoom level
- **Quadtree visualisation** — all leaf sectors are drawn as thin gray hairlines; the deepest sector under the mouse cursor is highlighted with a brighter, heavier outline
- **Camera controls**
  - Left-drag: pan
  - Mouse wheel: zoom toward cursor
- **Stats overlay** — live FPS, loaded rectangle count, chunk progress, draw calls, zoom, hover id, query time, and tree build time

---

## Running locally

No installation required.

```bash
cd path/to/mass-picker
python3 -m http.server
```

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in any browser that supports WebGL2
(Chrome, Firefox, Edge, Safari 15+).

---

## File layout

```
index.html                  Single-page shell, canvas, stats overlay
styles.css                  Full-window layout and overlay styling
js/
  main.js                   App bootstrap, input wiring, render loop
  config.js                 All tuneable constants (rect count, chunk sizes, zoom limits, …)
  renderer.js               WebGL2 context, chunked draw submission, hover and quadtree passes
  shaders.js                Inline GLSL — instanced rect shader + line shader for quadtree
  program.js                Shader compilation and linking helpers
  buffers.js                Shared quad geometry, per-chunk instance buffers, VAO setup
  camera.js                 2D camera — pan, zoom-to-cursor, screen↔world transforms
  math.js                   AABB helpers, rotated-rectangle edge distance
  data-manager.js           Worker orchestration, chunk ingestion, AABB table, quadtree population
  generator-worker.js       Clustered rectangle generation inside a Web Worker
  quadtree.js               Quadtree with AABB-overlap multi-sector insertion and range query
  picking.js                Mouse-move picking: threshold scaling, AABB quick-reject, edge distance
  overlay.js                Stats text rendering with throttled DOM updates
```

---

## Technical notes

### GPU buffer chunking

A single GPU allocation large enough for 10 million rectangles (≈240 MB) is not guaranteed to succeed on all hardware.
The renderer represents the dataset as an ordered list of chunk records, each backed by its own WebGL buffer and vertex array object.
Chunks are rendered with one `drawArraysInstanced` call each.

### Quadtree multi-sector insertion

Each rectangle is inserted into every quadtree leaf whose AABB overlaps the rectangle's own AABB (rotated bounding box).
This ensures that edge-proximity queries near sector boundaries never miss a rectangle.
The picking path uses a `Set` to deduplicate candidate ids collected across multiple leaves before running the exact edge-distance test.

### Edge distance test

Mouse coordinates are transformed into the rectangle's local axis-aligned frame by applying the inverse rotation.
In that frame the rectangle is a simple axis-aligned box, and the signed distance to the nearest edge is computed analytically.
Negative distances (point inside) are also handled so rectangles with the cursor inside them are still candidates.

### Coordinate precision

World coordinates are kept within ±32 768 units so single-precision float arithmetic in the vertex shader remains accurate at all zoom levels.
