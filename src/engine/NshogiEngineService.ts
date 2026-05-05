export type EngineStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

export interface EngineResult {
  id: string;
  result?: string;
  error?: string;
}

class NshogiEngineService {
  private worker: Worker | null = null;
  private status: EngineStatus = 'uninitialized';
  private readyPromise: Promise<void> | null = null;
  private callbacks: Map<string, (res: EngineResult) => void> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    if (this.worker) return;

    this.status = 'loading';
    this.worker = new Worker(
      new URL('./shogi-engine.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.readyPromise = new Promise((resolve, reject) => {
      this.worker!.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'status') {
          if (data.state === 'ready') {
            this.status = 'ready';
            resolve();
          } else if (data.state === 'error') {
            this.status = 'error';
            reject(new Error(data.error));
          }
        } else if (data.type === 'result') {
          const cb = this.callbacks.get(data.id);
          if (cb) {
            cb(data);
            this.callbacks.delete(data.id);
          }
        }
      };

      this.worker!.onerror = (err) => {
        console.error('[NshogiEngineService] Worker error:', err);
        this.status = 'error';
        reject(err);
      };

      this.worker!.postMessage({ type: 'init' });
    });
  }

  async waitForReady(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }
    throw new Error('Engine service not initialized');
  }

  async pickBestMove(
    position: string,
    movetimeMs: number = 200,
    depth: number = 3,
    seed?: number,
    topK: number = 5,
    temperature: number = 0.5
  ): Promise<string> {
    await this.waitForReady();

    const id = Math.random().toString(36).substring(7);
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, (res) => {
        if (res.error) {
          reject(new Error(res.error));
        } else {
          resolve(res.result!);
        }
      });

      this.worker!.postMessage({
        type: 'pickBestMove',
        id,
        position,
        movetimeMs,
        depth,
        seed,
        topK,
        temperature,
      });
    });
  }

  getStatus(): EngineStatus {
    return this.status;
  }
}

export const nshogiEngineService = new NshogiEngineService();
