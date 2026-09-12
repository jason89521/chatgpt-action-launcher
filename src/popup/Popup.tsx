import { useEffect, useState } from 'react';
import { ActionStore, type Action } from '../actions/actionStore';
import {
  captureActiveTabContext,
  type BrowserContext,
} from '../browserContext/browserContext';
import { renderPromptTemplate } from '../templates/templateRenderer';

export interface LaunchRequest {
  action: Action;
  context: BrowserContext;
  prompt: string;
}

export interface PopupActionStore {
  load(): Promise<Action[]>;
}

export interface PopupProps {
  actionStore?: PopupActionStore;
  captureContext?: () => Promise<BrowserContext | undefined>;
  onLaunch?: (request: LaunchRequest) => void | Promise<void>;
  onManageActions?: () => void;
}

const defaultActionStore = new ActionStore();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

export default function Popup({
  actionStore = defaultActionStore,
  captureContext = captureActiveTabContext,
  onLaunch,
  onManageActions,
}: PopupProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [launchError, setLaunchError] = useState<string>();
  const [launchingActionId, setLaunchingActionId] = useState<string>();
  const [preparedPrompt, setPreparedPrompt] = useState<string>();

  useEffect(() => {
    let isMounted = true;
    void actionStore
      .load()
      .then((loadedActions) => {
        if (isMounted) {
          setActions(loadedActions);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(getErrorMessage(error));
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [actionStore]);

  async function handleActionClick(action: Action) {
    setLaunchingActionId(action.id);
    setLaunchError(undefined);
    setPreparedPrompt(undefined);
    try {
      const context = await captureContext();
      if (!context) {
        throw new Error('The active page could not be accessed.');
      }
      const prompt = renderPromptTemplate(action.promptTemplate, context);
      setPreparedPrompt(prompt);
      await onLaunch?.({ action, context, prompt });
    } catch (error: unknown) {
      setLaunchError(getErrorMessage(error));
    } finally {
      setLaunchingActionId(undefined);
    }
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <p className="eyebrow">Prompt workspace</p>
          <h1>ChatGPT Action Launcher</h1>
        </div>
        <button
          className="manage-button"
          type="button"
          onClick={() => onManageActions?.()}
        >
          Manage actions
        </button>
      </header>

      {isLoading && <p className="status-message">Loading actions…</p>}
      {loadError && (
        <section className="state-card error-card" role="alert">
          <h2>Unable to load actions</h2>
          <p>{loadError}</p>
        </section>
      )}
      {!isLoading && !loadError && actions.length === 0 && (
        <section className="state-card empty-card">
          <h2>No actions yet</h2>
          <p>Create a reusable prompt to launch it from any page.</p>
          <button type="button" onClick={() => onManageActions?.()}>
            Add your first action
          </button>
        </section>
      )}
      {!isLoading && !loadError && actions.length > 0 && (
        <section aria-label="Saved actions" className="actions-list">
          {actions.map((action) => (
            <button
              className="action-button"
              disabled={launchingActionId !== undefined}
              key={action.id}
              type="button"
              onClick={() => void handleActionClick(action)}
            >
              <span className="action-name">{action.name}</span>
              <span className="action-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </section>
      )}
      {launchingActionId && <p className="status-message">Preparing prompt…</p>}
      {launchError && (
        <section className="state-card error-card" role="alert">
          <h2>Unable to prepare prompt</h2>
          <p>{launchError}</p>
        </section>
      )}
      {preparedPrompt && (
        <section className="prepared-prompt" aria-live="polite">
          <p className="prepared-label">Prompt ready</p>
          <pre>{preparedPrompt}</pre>
        </section>
      )}
    </main>
  );
}
