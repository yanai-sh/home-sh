import { type SearchEntry, type SearchHit, workspaceSearchEntries } from './search-client';

interface SearchIndexInstance {
  len(): number;
  search(query: string): SearchHit[];
}

interface SearchModule {
  default(input?: RequestInfo | URL | WebAssembly.Module): Promise<unknown>;
  init(): void;
  SearchIndex: new (entries: SearchEntry[]) => SearchIndexInstance;
}

type WorkerRequest =
  | {
      id: number;
      type: 'init';
    }
  | {
      id: number;
      type: 'search';
      query: string;
    };

type WorkerResponse =
  | {
      id: number;
      type: 'ready';
      len: number;
    }
  | {
      id: number;
      type: 'results';
      hits: SearchHit[];
    }
  | {
      id: number;
      type: 'error';
      message: string;
    };

let indexPromise: Promise<SearchIndexInstance> | undefined;

async function loadIndex(): Promise<SearchIndexInstance> {
  indexPromise ??= (async () => {
    const moduleUrl = new URL('/wasm/search/search.js', globalThis.location.href).href;
    const mod = (await import(/* @vite-ignore */ moduleUrl)) as unknown as SearchModule;
    await mod.default();
    mod.init();
    return new mod.SearchIndex(workspaceSearchEntries());
  })();

  return indexPromise;
}

function post(response: WorkerResponse): void {
  globalThis.postMessage(response);
}

globalThis.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  void (async () => {
    try {
      const index = await loadIndex();
      if (message.type === 'init') {
        post({ id: message.id, len: index.len(), type: 'ready' });
        return;
      }
      post({ id: message.id, hits: index.search(message.query), type: 'results' });
    } catch (error) {
      post({
        id: message.id,
        message: error instanceof Error ? error.message : 'search unavailable',
        type: 'error',
      });
    }
  })();
});
