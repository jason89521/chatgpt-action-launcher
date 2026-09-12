export interface BrowserContext {
  url: string;
  title: string;
  selection: string;
}

interface ActiveTab {
  id?: number;
  url?: string;
  title?: string;
}

interface ScriptResult {
  result?: unknown;
}

export interface BrowserContextApi {
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<ActiveTab[]>;
  };
  scripting: {
    executeScript(injection: {
      target: { tabId: number };
      func: () => string;
    }): Promise<ScriptResult[]>;
  };
}

function readSelectedText(): string {
  return window.getSelection()?.toString() ?? '';
}

function getDefaultBrowserContextApi(): BrowserContextApi {
  return browser as unknown as BrowserContextApi;
}

/**
 * Captures browser context only when explicitly requested by the caller.
 * Restricted pages and tabs without script access return no context.
 */
export async function captureActiveTabContext(
  browserApi?: BrowserContextApi,
): Promise<BrowserContext | undefined> {
  try {
    const api = browserApi ?? getDefaultBrowserContextApi();
    const [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
    if (
      activeTab?.id === undefined ||
      activeTab.url === undefined ||
      activeTab.title === undefined
    ) {
      return undefined;
    }

    const [scriptResult] = await api.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: readSelectedText,
    });

    return {
      url: activeTab.url,
      title: activeTab.title,
      selection: typeof scriptResult?.result === 'string' ? scriptResult.result : '',
    };
  } catch {
    return undefined;
  }
}
