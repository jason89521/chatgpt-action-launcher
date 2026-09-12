import { describe, expect, it, vi } from 'vitest';
import {
  buildChatGPTLaunchUrl,
  launchPromptInNewChatGPTTab,
  requestChatGPTLaunch,
  type ChatGPTBrowserApi,
} from '../src/chatgpt/chatgptAdapter';
import { submitChatGPTPrompt } from '../src/chatgpt/chatgptContentScript';

function createApi(sendMessage: ChatGPTBrowserApi['tabs']['sendMessage']): ChatGPTBrowserApi {
  return {
    tabs: {
      create: vi.fn(async () => ({ id: 123 })),
      sendMessage,
    },
  };
}

describe('launchPromptInNewChatGPTTab', () => {
  it('opens a fresh ChatGPT tab with the encoded prompt URL', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Review https://example.com\nSelected text', true, api),
    ).resolves.toEqual({ tabId: 123 });

    expect(api.tabs.create).toHaveBeenCalledWith({
      url: 'https://chatgpt.com/?prompt=Review+https%3A%2F%2Fexample.com%0ASelected+text',
    });
    expect(sendMessage).toHaveBeenCalledWith(123, {
      type: 'chatgpt:submit-prompt',
    });
  });

  it('encodes all prompt content through URLSearchParams', () => {
    const prompt = '你好 👋\nhttps://example.com/?a=1&b=2';
    const launchUrl = new URL(buildChatGPTLaunchUrl(prompt));

    expect(launchUrl.origin + launchUrl.pathname).toBe('https://chatgpt.com/');
    expect(launchUrl.searchParams.get('prompt')).toBe(prompt);
  });

  it('uses a configured ChatGPT destination and replaces only its prompt parameter', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab(
        '你好 👋\nhttps://example.com/?a=1&b=2',
        false,
        api,
        { targetUrl: 'https://chatgpt.com/g/g-p-example/project?foo=bar&prompt=old' },
      ),
    ).resolves.toEqual({ tabId: 123 });

    const createdUrl = new URL((api.tabs.create as ReturnType<typeof vi.fn>).mock.calls[0]![0].url);
    expect(createdUrl.origin + createdUrl.pathname).toBe('https://chatgpt.com/g/g-p-example/project');
    expect(createdUrl.searchParams.get('foo')).toBe('bar');
    expect(createdUrl.searchParams.get('prompt')).toBe('你好 👋\nhttps://example.com/?a=1&b=2');
    expect(createdUrl.searchParams.getAll('prompt')).toHaveLength(1);
  });

  it('does not contact the content script when auto-submit is disabled', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api = createApi(sendMessage);

    await expect(launchPromptInNewChatGPTTab('Review this first', false, api)).resolves.toEqual({
      tabId: 123,
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('retries until the content script reports that the composer is ready', async () => {
    const sendMessage = vi
      .fn<ChatGPTBrowserApi['tabs']['sendMessage']>()
      .mockRejectedValueOnce(new Error('Receiving end does not exist'))
      .mockResolvedValueOnce({ ok: false, error: 'Composer is not ready.' })
      .mockResolvedValueOnce({ ok: true });
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', true, api, { retryIntervalMs: 0 }),
    ).resolves.toEqual({ tabId: 123 });
    expect(sendMessage).toHaveBeenCalledTimes(3);
  });

  it('retries when the send button is initially unavailable', async () => {
    document.body.innerHTML = '';
    const sendMessage = vi.fn(async () => {
      const response = submitChatGPTPrompt(document);
      if (sendMessage.mock.calls.length === 1) {
        document.body.innerHTML = '<button data-testid="send-button"></button>';
      }
      return response;
    });
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', true, api, { retryIntervalMs: 0 }),
    ).resolves.toEqual({ tabId: 123 });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('retries when the send button is initially disabled', async () => {
    document.body.innerHTML = '<button data-testid="send-button" disabled></button>';
    const sendMessage = vi.fn(async () => {
      const response = submitChatGPTPrompt(document);
      if (sendMessage.mock.calls.length === 1) {
        document.querySelector<HTMLButtonElement>('[data-testid="send-button"]')!.disabled = false;
      }
      return response;
    });
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', true, api, { retryIntervalMs: 0 }),
    ).resolves.toEqual({ tabId: 123 });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('surfaces a failure instead of reporting success when the composer never becomes ready', async () => {
    const sendMessage = vi.fn(async () => ({ ok: false, error: 'Composer is not ready.' }));
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', true, api, { timeoutMs: 1, retryIntervalMs: 0 }),
    ).rejects.toThrow('Composer is not ready.');
    expect(sendMessage).toHaveBeenLastCalledWith(123, {
      type: 'chatgpt:launch-error',
      error: 'Composer is not ready.',
    });
  });

  it('sends requests through the background context', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api: ChatGPTBrowserApi = {
      tabs: {
        create: vi.fn(),
        sendMessage: vi.fn(),
      },
      runtime: { sendMessage },
    };

    await expect(requestChatGPTLaunch('Prompt', false, api)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'chatgpt:request-launch',
      prompt: 'Prompt',
      autoSubmit: false,
    });
  });

  it('sends the configured destination through the background context', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api: ChatGPTBrowserApi = {
      tabs: {
        create: vi.fn(),
        sendMessage: vi.fn(),
      },
      runtime: { sendMessage },
    };

    await expect(
      requestChatGPTLaunch('Prompt', false, 'https://chatgpt.com/g/g-p-example/project', api),
    ).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'chatgpt:request-launch',
      prompt: 'Prompt',
      autoSubmit: false,
      targetUrl: 'https://chatgpt.com/g/g-p-example/project',
    });
  });
});
