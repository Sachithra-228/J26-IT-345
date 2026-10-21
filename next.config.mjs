import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // ONNX emits its already-minified ESM runtime as a self-referencing asset.
    // Next 14's SWC minifier parses assets as scripts, rejecting import.meta.
    // Preserve only these vendor modules; normal application chunks still minify.
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.compilation.tap("PreserveOnnxRuntimeModules", (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: "PreserveOnnxRuntimeModules",
              stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE - 1,
            },
            () => {
              for (const asset of compilation.getAssets()) {
                if (/^static\/media\/ort\.[^/]+\.min\.[0-9a-f]+\.mjs$/.test(asset.name)) {
                  compilation.updateAsset(asset.name, asset.source, { minimized: true });
                }
              }
            },
          );
        });
      },
    });
    // Text inference runs in the browser; exclude optional native Node bindings.
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
      "@huggingface/transformers$": fileURLToPath(new URL("./node_modules/@huggingface/transformers/dist/transformers.web.js", import.meta.url)),
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
