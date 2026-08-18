/*
 * LaTeX Gym real-TeX worker adapter.
 * BusyTeX runtime: https://github.com/busytex/busytex
 *
 * Runtime assets are copied into the deployed site during CI so the worker loads
 * every executable/data resource from the same origin. This avoids release-host
 * CORS differences and keeps the exact BusyTeX build pinned by the deployment
 * workflow instead of silently following /latest/.
 */

const ASSET_BASE = new URL('./busytex/', self.location.href).href;
importScripts(`${ASSET_BASE}busytex_pipeline.js`);

const DATA_PACKAGES = [
  `${ASSET_BASE}texlive-basic.js`,
  `${ASSET_BASE}ubuntu-texlive-latex-recommended.js`,
  `${ASSET_BASE}ubuntu-texlive-latex-extra.js`,
  `${ASSET_BASE}ubuntu-texlive-science.js`
];

let pipeline = null;
let initializing = null;

self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') return;

  if (data.type === 'initialize') {
    if (pipeline) {
      self.postMessage({ type: 'initialized' });
      return;
    }
    if (initializing) return;

    try {
      initializing = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('BusyTeX initialization timed out')), 60000);
        pipeline = new BusytexPipeline(
          `${ASSET_BASE}busytex.js`,
          `${ASSET_BASE}busytex.wasm`,
          DATA_PACKAGES,
          [`${ASSET_BASE}texlive-basic.js`],
          [],
          message => self.postMessage({ type: 'progress', message }),
          versions => {
            clearTimeout(timer);
            self.postMessage({ type: 'initialized', versions });
            resolve();
          },
          true,
          BusytexPipeline.ScriptLoaderWorker
        );
      });
      await initializing;
    } catch (error) {
      pipeline = null;
      self.postMessage({ type: 'runtime-error', message: String(error?.message || error) });
    } finally {
      initializing = null;
    }
    return;
  }

  if (data.type === 'compile') {
    if (!pipeline) {
      self.postMessage({ type: 'runtime-error', requestId: data.requestId, message: 'BusyTeX is not initialized.' });
      return;
    }

    try {
      const result = await pipeline.compile(
        data.files,
        data.mainFile,
        data.bibtex,
        'silent',
        data.driver,
        data.dataPackages || null
      );
      const transfer = result.pdf?.buffer instanceof ArrayBuffer ? [result.pdf.buffer] : [];
      self.postMessage({ type: 'compile-result', requestId: data.requestId, result }, transfer);
    } catch (error) {
      self.postMessage({
        type: 'runtime-error',
        requestId: data.requestId,
        message: String(error?.message || error),
        stack: error?.stack || ''
      });
    }
  }
};
