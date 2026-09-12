import { describe, expect, it } from 'vitest';
import {
  ActionStore,
  DEFAULT_ACTION,
  type Action,
  type ActionStorageArea,
} from '../src/actions/actionStore';

function createMemoryStorage(initialValue: unknown = undefined): ActionStorageArea & {
  value: unknown;
} {
  return {
    value: initialValue,
    async get(key) {
      return { [key]: this.value };
    },
    async set(values) {
      this.value = values.actions;
    },
  };
}

describe('ActionStore', () => {
  it('seeds the default action when storage has not been initialized', async () => {
    const storage = createMemoryStorage();
    const store = new ActionStore(storage);

    await expect(store.load()).resolves.toEqual([DEFAULT_ACTION]);
    expect(storage.value).toEqual([DEFAULT_ACTION]);
  });

  it('does not overwrite existing actions, including an intentionally empty list', async () => {
    const storage = createMemoryStorage([]);
    const store = new ActionStore(storage);

    await expect(store.load()).resolves.toEqual([]);
    expect(storage.value).toEqual([]);
  });

  it('does not restore the default action after the user deletes it', async () => {
    const storage = createMemoryStorage();
    const store = new ActionStore(storage);
    const [defaultAction] = await store.load();

    await expect(store.delete(defaultAction!.id)).resolves.toBe(true);
    await expect(store.load()).resolves.toEqual([]);
  });

  it('creates and loads actions from local storage', async () => {
    const storage = createMemoryStorage([]);
    const store = new ActionStore(storage);

    const action = await store.create({
      name: 'Review page',
      promptTemplate: 'Review {{url}}',
      autoSubmit: true,
    });

    expect(action).toMatchObject({
      name: 'Review page',
      promptTemplate: 'Review {{url}}',
      autoSubmit: true,
      order: 0,
    });
    expect(action.id).toEqual(expect.any(String));
    await expect(store.load()).resolves.toEqual([action]);
  });

  it('normalizes missing and empty target URLs without adding a destination', async () => {
    const storage = createMemoryStorage([
      { id: 'missing', name: 'Missing target', promptTemplate: 'Prompt' },
      { id: 'empty', name: 'Empty target', promptTemplate: 'Prompt', targetUrl: '   ' },
    ]);
    const store = new ActionStore(storage);

    await expect(store.load()).resolves.toEqual([
      { id: 'missing', name: 'Missing target', promptTemplate: 'Prompt', order: 0, autoSubmit: false },
      { id: 'empty', name: 'Empty target', promptTemplate: 'Prompt', order: 1, autoSubmit: false },
    ]);
  });

  it('persists a valid ChatGPT target URL', async () => {
    const store = new ActionStore(createMemoryStorage([]));

    await expect(store.create({
      name: 'Use project',
      promptTemplate: 'Review {{url}}',
      autoSubmit: false,
      targetUrl: 'https://chatgpt.com/g/g-p-example/project',
    })).resolves.toMatchObject({
      targetUrl: 'https://chatgpt.com/g/g-p-example/project',
    });
  });

  it.each([
    'http://chatgpt.com/g/g-p-example/project',
    'https://example.com/chat',
    'not a URL',
  ])('rejects an invalid target URL: %s', async (targetUrl) => {
    const store = new ActionStore(createMemoryStorage([]));

    await expect(store.create({
      name: 'Invalid target',
      promptTemplate: 'Prompt',
      autoSubmit: false,
      targetUrl,
    })).rejects.toThrow('Destination URL must be an HTTPS chatgpt.com URL.');
  });

  it('normalizes malformed and legacy stored actions', async () => {
    const storage = createMemoryStorage([
      { id: 'keep', name: '  Existing  ', prompt: 'Old prompt', order: 9 },
      { id: 'bad', name: '', promptTemplate: 'ignored' },
      { id: 'missing-prompt', name: 'No prompt' },
      { id: 'duplicate', name: 'Duplicate', promptTemplate: 'Okay', order: 1 },
      { id: 'duplicate', name: 'Duplicate again', promptTemplate: 'Okay', order: 0 },
      'not an action',
    ]);
    const store = new ActionStore(storage);

    await expect(store.load()).resolves.toEqual([
      {
        id: 'duplicate',
        name: 'Duplicate again',
        promptTemplate: 'Okay',
        order: 0,
        autoSubmit: false,
      },
      {
        id: 'keep',
        name: 'Existing',
        promptTemplate: 'Old prompt',
        order: 1,
        autoSubmit: false,
      },
    ]);
    expect(storage.value).toEqual([
      {
        id: 'duplicate',
        name: 'Duplicate again',
        promptTemplate: 'Okay',
        order: 0,
        autoSubmit: false,
      },
      {
        id: 'keep',
        name: 'Existing',
        promptTemplate: 'Old prompt',
        order: 1,
        autoSubmit: false,
      },
    ]);
  });

  it('updates and deletes an action', async () => {
    const store = new ActionStore(createMemoryStorage([]));
    const first = await store.create({ name: 'First', promptTemplate: 'One', autoSubmit: false });
    const second = await store.create({ name: 'Second', promptTemplate: 'Two', autoSubmit: true });

    await expect(store.update(first.id, { name: 'Updated', autoSubmit: true })).resolves.toEqual({
      ...first,
      name: 'Updated',
      autoSubmit: true,
    });
    await expect(store.delete(second.id)).resolves.toBe(true);
    await expect(store.delete(second.id)).resolves.toBe(false);
    await expect(store.load()).resolves.toEqual([{ ...first, name: 'Updated', autoSubmit: true }]);
  });

  it('clears an existing target URL when it is edited empty', async () => {
    const store = new ActionStore(createMemoryStorage([]));
    const action = await store.create({
      name: 'Project action',
      promptTemplate: 'Prompt',
      autoSubmit: false,
      targetUrl: 'https://chatgpt.com/g/g-p-example/project',
    });

    await expect(store.update(action.id, { targetUrl: '' })).resolves.toEqual({
      id: action.id,
      name: action.name,
      promptTemplate: action.promptTemplate,
      order: action.order,
      autoSubmit: action.autoSubmit,
    });
    await expect(store.load()).resolves.toEqual([{
      id: action.id,
      name: action.name,
      promptTemplate: action.promptTemplate,
      order: action.order,
      autoSubmit: action.autoSubmit,
    }]);
  });

  it('validates and persists a target URL when an action is updated', async () => {
    const store = new ActionStore(createMemoryStorage([]));
    const action = await store.create({ name: 'Project action', promptTemplate: 'Prompt', autoSubmit: false });

    await expect(store.update(action.id, {
      targetUrl: 'https://chatgpt.com/g/g-p-updated/project',
    })).resolves.toMatchObject({
      targetUrl: 'https://chatgpt.com/g/g-p-updated/project',
    });
    await expect(store.load()).resolves.toEqual([{
      ...action,
      targetUrl: 'https://chatgpt.com/g/g-p-updated/project',
    }]);
  });

  it('rejects an invalid target URL when an action is updated', async () => {
    const store = new ActionStore(createMemoryStorage([]));
    const action = await store.create({ name: 'Project action', promptTemplate: 'Prompt', autoSubmit: false });

    await expect(store.update(action.id, { targetUrl: 'https://example.com/chat' })).rejects.toThrow(
      'Destination URL must be an HTTPS chatgpt.com URL.',
    );
  });

  it('reorders actions and keeps unspecified actions at the end', async () => {
    const store = new ActionStore(createMemoryStorage([]));
    const actions: Action[] = [
      await store.create({ name: 'First', promptTemplate: 'One', autoSubmit: false }),
      await store.create({ name: 'Second', promptTemplate: 'Two', autoSubmit: false }),
      await store.create({ name: 'Third', promptTemplate: 'Three', autoSubmit: false }),
    ];

    await expect(store.reorder([actions[2]!.id, 'unknown', actions[0]!.id])).resolves.toEqual([
      { ...actions[2], order: 0 },
      { ...actions[0], order: 1 },
      { ...actions[1], order: 2 },
    ]);
  });
});
