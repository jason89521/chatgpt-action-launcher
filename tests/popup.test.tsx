import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Popup from '../src/popup/Popup';
import type { Action } from '../src/actions/actionStore';
import type { ActionManagerStore } from '../src/popup/ActionManager';
import type { BrowserContext } from '../src/browserContext/browserContext';

const actions: Action[] = [
  {
    id: 'review',
    name: 'Review page',
    promptTemplate: 'Review {{url}}: {{title}}\n{{selection}}',
    order: 0,
    autoSubmit: true,
  },
  {
    id: 'summarize',
    name: 'Summarize this page with a deliberately long action name',
    promptTemplate: 'Summarize {{title}}',
    order: 1,
    autoSubmit: false,
  },
];

function createStore(items: Action[] = actions): ActionManagerStore {
  return {
    load: vi.fn(async () => items),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  };
}

const context: BrowserContext = {
  url: 'https://example.com/article',
  title: 'Example article',
  selection: 'Selected text',
};

describe('popup', () => {
  afterEach(() => cleanup());

  it('loads and displays saved actions in their configured order', async () => {
    render(
      <Popup actionStore={createStore()} captureContext={vi.fn(async () => context)} />,
    );

    expect(screen.getByText('Loading actions…')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Review page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Summarize this page/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage actions' })).toBeInTheDocument();
  });

  it('guides the user to create an action when none are saved', async () => {
    const onManageActions = vi.fn();
    render(
      <Popup
        actionStore={createStore([])}
        captureContext={vi.fn(async () => context)}
        onManageActions={onManageActions}
      />,
    );

    expect(await screen.findByText('No actions yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add your first action' }));
    expect(onManageActions).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Manage actions' })).toBeInTheDocument();
  });

  it('captures context, renders the prompt, and invokes the launch boundary', async () => {
    const captureContext = vi.fn(async () => context);
    const onLaunch = vi.fn();
    render(
      <Popup
        actionStore={createStore([actions[0]!])}
        captureContext={captureContext}
        onLaunch={onLaunch}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Review page' }));

    await waitFor(() =>
      expect(onLaunch).toHaveBeenCalledWith({
        action: actions[0],
        context,
        prompt: 'Review https://example.com/article: Example article\nSelected text',
      }),
    );
    expect(captureContext).toHaveBeenCalledOnce();
    expect(screen.getByText('Prompt ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent?.startsWith('Review https://example.com/article: Example article') ?? false,
      ),
    ).toBeInTheDocument();
  });

  it('shows a visible error when loading actions fails', async () => {
    const actionStore = {
      load: vi.fn(async () => {
        throw new Error('Storage unavailable');
      }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    };
    render(
      <Popup actionStore={actionStore} captureContext={vi.fn(async () => context)} />,
    );

    expect(await screen.findByText('Unable to load actions')).toBeInTheDocument();
    expect(screen.getByText('Storage unavailable')).toBeInTheDocument();
  });

  it('shows a visible error when browser context cannot be captured', async () => {
    render(
      <Popup
        actionStore={createStore([actions[0]!])}
        captureContext={vi.fn(async () => undefined)}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Review page' }));
    expect(await screen.findByText('Unable to prepare prompt')).toBeInTheDocument();
    expect(screen.getByText('The active page could not be accessed.')).toBeInTheDocument();
  });
});
