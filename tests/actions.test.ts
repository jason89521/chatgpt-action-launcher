import { describe, expect, it } from 'vitest';
import {
  ActionStore,
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
  it('creates and loads actions from local storage', async () => {
    const storage = createMemoryStorage();
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
    const store = new ActionStore(createMemoryStorage());
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

  it('reorders actions and keeps unspecified actions at the end', async () => {
    const store = new ActionStore(createMemoryStorage());
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
