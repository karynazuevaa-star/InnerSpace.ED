import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @mediapipe/face_mesh has no real ES module exports (Closure-compiled
      // classic script) - `import * as t from "@mediapipe/face_mesh"` in
      // @tensorflow-models/face-landmarks-detection resolves t.FaceMesh to
      // undefined and throws. Redirect it to a shim that re-exports the
      // window.FaceMesh global set by the <script> tag in index.html.
      '@mediapipe/face_mesh': fileURLToPath(
        new URL('./src/gaze/mediapipeFaceMeshShim.ts', import.meta.url),
      ),
    },
  },
})
