/*
 * LaTeX Gym real-TeX worker adapter.
 * BusyTeX runtime: https://github.com/busytex/busytex
 * BusyTeX source code is MIT licensed; release binaries contain TeX Live components
 * under their respective licenses. The runtime is loaded lazily and is not bundled
 * into the application shell.
 */

const RELEASE_BASE = 'https://github.com/busytex/busytex/releases/latest/download';
importScripts(`${RELEASE_BASE}/busytex_pipeline.js`);

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
        const timer = setTimeout(() => reject(new Error('BusyTeX initialization timed out')), 45000);
        pipeline = new BusytexPipeline(
          `${RELEASE_BASE}/busytex.js`,
          `${RELEASE_BASE}/busytex.wasm`,
          [
            `${RELEASE_BASE}/texlive-basic.js`,
            `${RELEASE_BASE}/ubuntu-texlive-latex-recommended.js`,
            `${RELEASE_BASE}/ubuntu-texlive-latex-extra.js`,
            `${RELEASE_BASE}/ubuntu-texlive-science.js`
          ],
          [`${RELEASE_BASE}/texlive-basic.js`],
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
        data.dataPackages || []
      );
      self.postMessage({ type: 'compile-result', requestId: data.requestId, result }, result.pdf ? [result.pdf.buffer] : []);
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
