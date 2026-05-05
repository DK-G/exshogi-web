/// <reference lib="webworker" />
// @ts-ignore
import createModule from './nshogi-heuristic.js';

let engine: any = null;

async function init() {
  try {
    console.log('[ShogiWorker] Initializing engine...');
    engine = await createModule({
      print: (t: string) => console.log('[Nshogi]', t),
      printErr: (t: string) => console.warn('[Nshogi Err]', t),
    });
    postMessage({ type: 'status', state: 'ready' });
  } catch (e) {
    console.error('[ShogiWorker] Initialization failed:', e);
    postMessage({ type: 'status', state: 'error', error: String(e) });
  }
}

addEventListener('message', async (event) => {
  const data = event.data;

  if (data.type === 'init') {
    await init();
  } else if (data.type === 'pickBestMove') {
    if (!engine) {
      postMessage({ type: 'result', id: data.id, error: 'Engine not ready' });
      return;
    }

    try {
      let sfenArg = data.position || '';
      if (sfenArg.startsWith('sfen ')) {
        sfenArg = sfenArg.slice(5);
      }

      const result = engine.ccall(
        'pickBestMoveUSI',
        'string',
        ['string', 'number', 'number', 'number', 'number', 'number'],
        [
          sfenArg,
          data.movetimeMs ?? 200,
          data.depth ?? 3,
          data.topK ?? 5,
          data.temperature ?? 0.5,
          data.seed ?? Math.floor(Math.random() * 0xFFFFFFFF),
        ]
      );

      postMessage({ type: 'result', id: data.id, result });
    } catch (e) {
      postMessage({ type: 'result', id: data.id, error: String(e) });
    }
  }
});
