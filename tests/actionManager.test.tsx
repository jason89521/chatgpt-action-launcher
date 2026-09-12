import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ActionManager from '../src/popup/ActionManager';
import type { Action } from '../src/actions/actionStore';
import type { ActionInput, ActionUpdate } from '../src/actions/actionStore';
import type { ActionManagerStore } from '../src/popup/ActionManager';

const firstAction: Action = {
  id: 'first',
  name: 'Review page',
  promptTemplate: 'Review {{url}}',
  order: 0,
  autoSubmit: true,
};

const secondAction: Action = {
  id: 'second',
  name: 'Summarize',
  promptTemplate: 'Summarize {{title}}',
  order: 1,
  autoSubmit: false,
};

function createStore(items: Action[] = [firstAction, secondAction]): ActionManagerStore {
  return {
    load: vi.fn(async () => items),
    create: vi.fn(async (input: ActionInput) => ({ ...input, id: 'new', order: items.length })),
    update: vi.fn(async (id: string, changes: ActionUpdate) => {
      const action = items.find((item) => item.id === id);
      return action ? { ...action, ...changes } : undefined;
    }),
    delete: vi.fn(async () => true),
    reorder: vi.fn(async (ids: string[]) => ids.map((id, order) => ({ ...(items.find((item) => item.id === id)!), order }))),
  };
}

describe('ActionManager', () => {
  afterEach(() => cleanup());

  it('creates an action from the editor form', async () => {
    const store = createStore([]);
    render(<ActionManager actionStore={store} />);

    await screen.findByRole('heading', { name: 'Manage actions' });
    fireEvent.change(screen.getByLabelText('Action name'), { target: { value: 'Review' } });
    fireEvent.change(screen.getByLabelText('Prompt template'), { target: { value: 'Review {{url}}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create action' }));

    await waitFor(() => expect(store.create).toHaveBeenCalledWith({
      name: 'Review',
      promptTemplate: 'Review {{url}}',
      autoSubmit: false,
    }));
  });

  it('updates an action and exposes supported variables', async () => {
    const store = createStore();
    render(<ActionManager actionStore={store} />);

    await screen.findByDisplayValue('Review page');
    fireEvent.change(screen.getByDisplayValue('Review page'), { target: { value: 'Review article' } });
    fireEvent.change(screen.getByDisplayValue('Review {{url}}'), { target: { value: 'Read {{selection}}' } });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Auto-submit' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Save Review article' }));

    await waitFor(() => expect(store.update).toHaveBeenCalledWith('first', {
      name: 'Review article',
      promptTemplate: 'Read {{selection}}',
      autoSubmit: false,
    }));
    expect(screen.getByText('{{url}}')).toBeInTheDocument();
    expect(screen.getByText('{{title}}')).toBeInTheDocument();
    expect(screen.getByText('{{selection}}')).toBeInTheDocument();
  });

  it('requires confirmation before deleting and reorders actions', async () => {
    const store = createStore();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ActionManager actionStore={store} />);

    await screen.findByDisplayValue('Review page');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Review page' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Move up' })[1]!);

    expect(confirmSpy).toHaveBeenCalledWith('Delete “Review page”?');
    await waitFor(() => expect(store.delete).toHaveBeenCalledWith('first'));
    expect(store.reorder).toHaveBeenCalledWith(['second', 'first']);
    confirmSpy.mockRestore();
  });
});
