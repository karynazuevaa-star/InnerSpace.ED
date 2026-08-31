// @mediapipe/face_mesh ships as a Closure-compiled classic script with no
// real ES module exports - it just assigns `window.FaceMesh` as a side
// effect when loaded via a plain <script> tag (see index.html). Vite/Rollup
// can't see that assignment through `import * as t from "@mediapipe/face_mesh"`,
// so `t.FaceMesh` resolves to `undefined` and `new t.FaceMesh(...)` throws.
// This shim is aliased in place of that package (see vite.config.ts) and
// re-exports the already-loaded global instead.
export const FaceMesh = (window as unknown as { FaceMesh: unknown }).FaceMesh;
