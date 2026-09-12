import { describe, expect, it } from 'vitest';
import {
  captureActiveTabContext,
  type BrowserContextApi,
} from '../src/browserContext/browserContext';

function createBrowserContextApi(
  overrides: Partial<BrowserContextApi> = {},
): BrowserContextApi {
  return {
    tabs: {
      query: async () => [{ id: 42, url: 'https://example.com', title: 'Example' }],
    },
    scripting: {
      executeScript: async () => [{ result: 'Selected text' }],
    },
    ...overrides,
  };
}

describe('captureActiveTabContext', () => {
  it('captures the active tab URL, title, and selected text', async () => {
    await expect(captureActiveTabContext(createBrowserContextApi())).resolves.toEqual({
      url: 'https://example.com',
      title: 'Example',
      selection: 'Selected text',
    });
  });

  it('returns an empty selection when no text is selected', async () => {
    const api = createBrowserContextApi({
      scripting: { executeScript: async () => [{ result: '' }] },
    });

    await expect(captureActiveTabContext(api)).resolves.toEqual({
      url: 'https://example.com',
      title: 'Example',
      selection: '',
    });
  });

  it('fails gracefully when the active page cannot be scripted', async () => {
    const api = createBrowserContextApi({
      scripting: {
        executeScript: async () => {
          throw new Error('Cannot access restricted page');
        },
      },
    });

    await expect(captureActiveTabContext(api)).resolves.toBeUndefined();
  });

  it('fails gracefully when there is no active tab', async () => {
    const api = createBrowserContextApi({
      tabs: { query: async () => [] },
    });

    await expect(captureActiveTabContext(api)).resolves.toBeUndefined();
  });
});
