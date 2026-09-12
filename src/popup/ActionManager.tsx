import { useEffect, useState } from 'react';
import type { Action, ActionInput, ActionUpdate } from '../actions/actionStore';

export interface ActionManagerStore {
  load(): Promise<Action[]>;
  create(input: ActionInput): Promise<Action>;
  update(id: string, changes: ActionUpdate): Promise<Action | undefined>;
  delete(id: string): Promise<boolean>;
  reorder(ids: string[]): Promise<Action[]>;
}

export interface ActionManagerProps {
  actionStore: ActionManagerStore;
  onBack?: () => void;
}

const supportedVariables = ['{{url}}', '{{title}}', '{{selection}}'] as const;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function actionInputFrom(action: Action): ActionInput {
  return {
    name: action.name,
    promptTemplate: action.promptTemplate,
    autoSubmit: action.autoSubmit,
    targetUrl: action.targetUrl,
  };
}

export default function ActionManager({ actionStore, onBack }: ActionManagerProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [newAction, setNewAction] = useState<ActionInput>({
    name: '',
    promptTemplate: '',
    autoSubmit: false,
    targetUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [savingId, setSavingId] = useState<string>();

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
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(loadError));
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [actionStore]);

  async function createAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      const created = await actionStore.create(newAction);
      setActions((current) => [...current, created]);
      setNewAction({ name: '', promptTemplate: '', autoSubmit: false, targetUrl: '' });
    } catch (createError: unknown) {
      setError(getErrorMessage(createError));
    }
  }

  async function updateAction(action: Action, changes: ActionInput) {
    setSavingId(action.id);
    setError(undefined);
    try {
      const updated = await actionStore.update(action.id, changes);
      if (updated) {
        setActions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
    } catch (updateError: unknown) {
      setError(getErrorMessage(updateError));
    } finally {
      setSavingId(undefined);
    }
  }

  async function deleteAction(action: Action) {
    if (!window.confirm(`Delete “${action.name}”?`)) {
      return;
    }
    setError(undefined);
    try {
      if (await actionStore.delete(action.id)) {
        setActions((current) => current.filter((item) => item.id !== action.id));
      }
    } catch (deleteError: unknown) {
      setError(getErrorMessage(deleteError));
    }
  }

  async function moveAction(action: Action, offset: -1 | 1) {
    const index = actions.findIndex((item) => item.id === action.id);
    const targetIndex = index + offset;
    if (index < 0 || targetIndex < 0 || targetIndex >= actions.length) {
      return;
    }
    const ids = actions.map((item) => item.id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex]!, ids[index]!];
    try {
      setActions(await actionStore.reorder(ids));
    } catch (reorderError: unknown) {
      setError(getErrorMessage(reorderError));
    }
  }

  return (
    <main className="popup-shell action-manager">
      <header className="popup-header">
        <div>
          <p className="eyebrow">Prompt workspace</p>
          <h1>Manage actions</h1>
        </div>
        {onBack && <button className="manage-button" type="button" onClick={onBack}>Back</button>}
      </header>

      {isLoading && <p className="status-message">Loading actions…</p>}
      {error && <p className="manager-error" role="alert">{error}</p>}
      {!isLoading && (
        <>
          <form className="action-editor new-action-editor" onSubmit={(event) => void createAction(event)}>
            <h2>Create action</h2>
            <label>
              Action name
              <input
                required
                value={newAction.name}
                onChange={(event) => setNewAction({ ...newAction, name: event.target.value })}
              />
            </label>
            <label>
              Prompt template
              <textarea
                required
                value={newAction.promptTemplate}
                onChange={(event) => setNewAction({ ...newAction, promptTemplate: event.target.value })}
              />
            </label>
            <label>
              ChatGPT destination URL
              <input
                aria-label="ChatGPT destination URL"
                type="text"
                value={newAction.targetUrl ?? ''}
                onChange={(event) => setNewAction({ ...newAction, targetUrl: event.target.value })}
              />
              <span className="field-help">Optional. Paste an HTTPS ChatGPT Project URL, such as https://chatgpt.com/g/g-p-&lt;project-id&gt;/project.</span>
            </label>
            <label className="checkbox-label">
              <input
                checked={newAction.autoSubmit}
                onChange={(event) => setNewAction({ ...newAction, autoSubmit: event.target.checked })}
                type="checkbox"
              />
              Auto-submit
            </label>
            <button className="primary-button" type="submit">Create action</button>
          </form>

          <section className="variable-help" aria-label="Supported template variables">
            <h2>Template variables</h2>
            <p>Use these values from the active browser tab:</p>
            <ul>{supportedVariables.map((variable) => <li key={variable}><code>{variable}</code></li>)}</ul>
          </section>

          <section className="managed-actions" aria-label="Existing actions">
            <h2>Saved actions</h2>
            {actions.length === 0 && <p className="muted-message">No saved actions yet.</p>}
            {actions.map((action, index) => (
              <ActionEditor
                action={action}
                isSaving={savingId === action.id}
                isFirst={index === 0}
                isLast={index === actions.length - 1}
                key={action.id}
                onDelete={() => void deleteAction(action)}
                onMove={(offset) => void moveAction(action, offset)}
                onSave={(changes) => void updateAction(action, changes)}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

interface ActionEditorProps {
  action: Action;
  isSaving: boolean;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onMove: (offset: -1 | 1) => void;
  onSave: (changes: ActionInput) => void;
}

function ActionEditor({ action, isSaving, isFirst, isLast, onDelete, onMove, onSave }: ActionEditorProps) {
  const [draft, setDraft] = useState(() => actionInputFrom(action));

  useEffect(() => setDraft(actionInputFrom(action)), [action]);

  return (
    <form className="action-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <label>
        Action name
        <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <label>
        Prompt template
        <textarea required value={draft.promptTemplate} onChange={(event) => setDraft({ ...draft, promptTemplate: event.target.value })} />
      </label>
      <label>
        ChatGPT destination URL
        <input
          aria-label="ChatGPT destination URL"
          type="text"
          value={draft.targetUrl ?? ''}
          onChange={(event) => setDraft({ ...draft, targetUrl: event.target.value })}
        />
        <span className="field-help">Optional. Paste an HTTPS ChatGPT Project URL, such as https://chatgpt.com/g/g-p-&lt;project-id&gt;/project.</span>
      </label>
      <label className="checkbox-label">
        <input
          aria-label="Auto-submit"
          checked={draft.autoSubmit}
          onChange={(event) => setDraft({ ...draft, autoSubmit: event.target.checked })}
          type="checkbox"
        />
        Auto-submit
      </label>
      <div className="editor-actions">
        <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : `Save ${draft.name || 'action'}`}</button>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst}>Move up</button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast}>Move down</button>
        <button className="danger-button" type="button" onClick={onDelete}>Delete {action.name}</button>
      </div>
    </form>
  );
}
