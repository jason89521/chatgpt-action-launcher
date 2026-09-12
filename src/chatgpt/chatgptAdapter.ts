export interface ChatGPTLaunchMessage {
  type: 'chatgpt:submit-prompt';
}

export interface ChatGPTLaunchErrorMessage {
  type: 'chatgpt:launch-error';
  error: string;
}

export interface ChatGPTLaunchResponse {
  ok: boolean;
  error?: string;
}

export interface ChatGPTLaunchRequest {
  type: 'chatgpt:request-launch';
  prompt: string;
  autoSubmit: boolean;
  targetUrl?: string;
}

export interface ChatGPTBrowserApi {
  tabs: {
    create(createProperties: { url: string }): Promise<{ id?: number }>;
    sendMessage(
      tabId: number,
      message: ChatGPTLaunchMessage | ChatGPTLaunchErrorMessage,
    ): Promise<ChatGPTLaunchResponse>;
  };
  runtime?: {
    sendMessage(message: ChatGPTLaunchRequest): Promise<ChatGPTLaunchResponse>;
  };
}

interface LaunchOptions {
  timeoutMs?: number;
  retryIntervalMs?: number;
  targetUrl?: string;
}

const CHATGPT_URL = 'https://chatgpt.com/';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_INTERVAL_MS = 100;

export function buildChatGPTLaunchUrl(prompt: string, targetUrl = CHATGPT_URL): string {
  const url = new URL(targetUrl);
  url.searchParams.set('prompt', prompt);
  return url.toString();
}

function getDefaultBrowserApi(): ChatGPTBrowserApi {
  return browser as unknown as ChatGPTBrowserApi;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Opens a new ChatGPT conversation with the rendered prompt in its URL. */
export async function launchPromptInNewChatGPTTab(
  prompt: string,
  autoSubmit: boolean,
  browserApi: ChatGPTBrowserApi = getDefaultBrowserApi(),
  options: LaunchOptions = {},
): Promise<{ tabId: number }> {
  const tab = await browserApi.tabs.create({ url: buildChatGPTLaunchUrl(prompt, options.targetUrl) });
  if (tab.id === undefined) {
    throw new Error('ChatGPT tab could not be opened.');
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;
  const message: ChatGPTLaunchMessage = {
    type: 'chatgpt:submit-prompt',
  };
  let lastError = 'The ChatGPT composer could not be used.';

  if (!autoSubmit) {
    return { tabId: tab.id };
  }

  while (Date.now() <= deadline) {
    try {
      const response = await browserApi.tabs.sendMessage(tab.id, message);
      if (response.ok) {
        return { tabId: tab.id };
      }
      lastError = response.error ?? lastError;
    } catch {
      // The content script may not have loaded yet. Retry within the bounded window.
    }
    await wait(retryIntervalMs);
  }

  try {
    await browserApi.tabs.sendMessage(tab.id, {
      type: 'chatgpt:launch-error',
      error: lastError,
    });
  } catch {
    // The content script may still be unavailable, but the launch error is final.
  }

  throw new Error(lastError);
}

/** Hands the launch to the background context so it survives popup closure. */
export async function requestChatGPTLaunch(
  prompt: string,
  autoSubmit: boolean,
  targetUrlOrBrowserApi?: string | ChatGPTBrowserApi,
  browserApi?: ChatGPTBrowserApi,
): Promise<void> {
  const targetUrl = typeof targetUrlOrBrowserApi === 'string' ? targetUrlOrBrowserApi : undefined;
  const launchBrowserApi = typeof targetUrlOrBrowserApi === 'string'
    ? browserApi ?? getDefaultBrowserApi()
    : targetUrlOrBrowserApi ?? browserApi ?? getDefaultBrowserApi();
  if (!launchBrowserApi.runtime) {
    throw new Error('The extension background service is unavailable.');
  }
  const response = await launchBrowserApi.runtime.sendMessage({
    type: 'chatgpt:request-launch',
    prompt,
    autoSubmit,
    ...(targetUrl ? { targetUrl } : {}),
  });
  if (!response.ok) {
    throw new Error(response.error ?? 'The ChatGPT composer could not be used.');
  }
}
