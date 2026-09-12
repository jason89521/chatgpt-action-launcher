import { describe, expect, it, vi } from 'vitest';
import {
  launchPromptInNewChatGPTTab,
  requestChatGPTLaunch,
  type ChatGPTBrowserApi,
} from '../src/chatgpt/chatgptAdapter';

function createApi(sendMessage: ChatGPTBrowserApi['tabs']['sendMessage']): ChatGPTBrowserApi {
  return {
    tabs: {
      create: vi.fn(async () => ({ id: 123 })),
      sendMessage,
    },
  };
}

describe('launchPromptInNewChatGPTTab', () => {
  it('opens a fresh ChatGPT tab and transfers the prompt with auto-submit setting', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Review https://example.com\nSelected text', true, api),
    ).resolves.toEqual({ tabId: 123 });

    expect(api.tabs.create).toHaveBeenCalledWith({ url: 'https://chatgpt.com/' });
    expect(sendMessage).toHaveBeenCalledWith(123, {
      type: 'chatgpt:launch-prompt',
      prompt: 'Review https://example.com\nSelected text',
      autoSubmit: true,
    });
  });

  it('retries until the content script reports that the composer is ready', async () => {
    const sendMessage = vi
      .fn<ChatGPTBrowserApi['tabs']['sendMessage']>()
      .mockRejectedValueOnce(new Error('Receiving end does not exist'))
      .mockResolvedValueOnce({ ok: false, error: 'Composer is not ready.' })
      .mockResolvedValueOnce({ ok: true });
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', false, api, { retryIntervalMs: 0 }),
    ).resolves.toEqual({ tabId: 123 });
    expect(sendMessage).toHaveBeenCalledTimes(3);
  });

  it('surfaces a failure instead of reporting success when the composer never becomes ready', async () => {
    const sendMessage = vi.fn(async () => ({ ok: false, error: 'Composer is not ready.' }));
    const api = createApi(sendMessage);

    await expect(
      launchPromptInNewChatGPTTab('Prompt', false, api, { timeoutMs: 1, retryIntervalMs: 0 }),
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
});
