//
// Copyright (c) 2022-2023 Ivan Teplov
// Licensed under the Apache license 2.0
//

import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  css: {
    modules: {
      localsConvention: "camelCase"
    }
  },
  build: {
    outDir: resolve(__dirname, "./build/"),
    lib: {
      entry: resolve(__dirname, "./library/index.jsx"),
      name: "BottomSheet",
      fileName: "index"
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: []
    }
  }
})