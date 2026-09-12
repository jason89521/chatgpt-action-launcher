export interface Action {
  id: string;
  name: string;
  promptTemplate: string;
  order: number;
  autoSubmit: boolean;
  targetUrl?: string;
}

export interface ActionInput {
  name: string;
  promptTemplate: string;
  autoSubmit: boolean;
  targetUrl?: string;
}

export type ActionUpdate = Partial<ActionInput>;

export interface ActionStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

const ACTIONS_STORAGE_KEY = 'actions';

export const DEFAULT_ACTION: Action = {
  id: 'default-evaluate-issue-for-luna',
  name: '🌙 Evaluate Issue for Luna',
  promptTemplate: `Review this GitHub issue:
{{url}}

Inspect the referenced GitHub issue and the relevant repository context. Decide whether the issue is suitable for GPT-5.6 Luna to implement independently.

If it is not suitable, split it into smaller implementation tickets and create them. Avoid asking the user follow-up questions unless you are genuinely blocked.`,
  order: 0,
  autoSubmit: false,
};

const browserStorageArea: ActionStorageArea = {
  get: (key) => browser.storage.local.get(key) as Promise<Record<string, unknown>>,
  set: (values) => browser.storage.local.set(values),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAction(value: unknown, fallbackOrder: number): Action | undefined {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()) {
    return undefined;
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const promptTemplate =
    typeof value.promptTemplate === 'string'
      ? value.promptTemplate
      : typeof value.prompt === 'string'
        ? value.prompt
        : undefined;

  if (!name || promptTemplate === undefined) {
    return undefined;
  }

  const order = typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : fallbackOrder;
  const targetUrl = normalizeTargetUrl(value.targetUrl);
  const validTargetUrl = targetUrl && isValidTargetUrl(targetUrl) ? targetUrl : undefined;

  return {
    id: value.id,
    name,
    promptTemplate,
    order,
    autoSubmit: typeof value.autoSubmit === 'boolean' ? value.autoSubmit : false,
    ...(validTargetUrl ? { targetUrl: validTargetUrl } : {}),
  };
}

function normalizeTargetUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

function validateTargetUrl(targetUrl: string | undefined): string | undefined {
  const normalizedTargetUrl = normalizeTargetUrl(targetUrl);
  if (!normalizedTargetUrl) {
    return undefined;
  }

  if (!isValidTargetUrl(normalizedTargetUrl)) {
    throw new Error('Destination URL must be an HTTPS chatgpt.com URL.');
  }

  return normalizedTargetUrl;
}

function isValidTargetUrl(targetUrl: string): boolean {
  try {
    const parsedUrl = new URL(targetUrl);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'chatgpt.com';
  } catch {
    return false;
  }
}

export function normalizeActions(value: unknown): Action[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item, index) => normalizeAction(item, index))
    .filter((action): action is Action => action !== undefined)
    .sort((left, right) => left.order - right.order);
  const seenIds = new Set<string>();

  return normalized
    .filter((action) => {
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    })
    .map((action, order) => ({ ...action, order }));
}

function validateInput(input: ActionInput): ActionInput {
  const name = input.name.trim();
  if (!name || !input.promptTemplate.trim()) {
    throw new Error('An action requires a name and prompt template.');
  }

  const targetUrl = validateTargetUrl(input.targetUrl);
  return {
    name,
    promptTemplate: input.promptTemplate,
    autoSubmit: input.autoSubmit,
    ...(targetUrl ? { targetUrl } : {}),
  };
}

function applyInput(existing: Pick<Action, 'id' | 'order'>, input: ActionInput): Action {
  return {
    id: existing.id,
    order: existing.order,
    name: input.name,
    promptTemplate: input.promptTemplate,
    autoSubmit: input.autoSubmit,
    ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
  };
}

export class ActionStore {
  constructor(private readonly storageArea: ActionStorageArea = browserStorageArea) {}

  async load(): Promise<Action[]> {
    const stored = await this.storageArea.get(ACTIONS_STORAGE_KEY);
    const hasStoredActions = stored[ACTIONS_STORAGE_KEY] !== undefined;
    const actions = hasStoredActions
      ? normalizeActions(stored[ACTIONS_STORAGE_KEY])
      : [DEFAULT_ACTION];
    await this.storageArea.set({ [ACTIONS_STORAGE_KEY]: actions });
    return actions;
  }

  async save(actions: Action[]): Promise<Action[]> {
    const normalized = normalizeActions(actions.map((action, order) => ({ ...action, order })));
    await this.storageArea.set({ [ACTIONS_STORAGE_KEY]: normalized });
    return normalized;
  }

  async create(input: ActionInput): Promise<Action> {
    const validInput = validateInput(input);
    const actions = await this.load();
    const action = applyInput({ id: crypto.randomUUID(), order: actions.length }, validInput);
    await this.save([...actions, action]);
    return action;
  }

  async update(id: string, changes: ActionUpdate): Promise<Action | undefined> {
    const actions = await this.load();
    const existing = actions.find((action) => action.id === id);
    if (!existing) {
      return undefined;
    }

    const updated = validateInput({
      name: changes.name ?? existing.name,
      promptTemplate: changes.promptTemplate ?? existing.promptTemplate,
      autoSubmit: changes.autoSubmit ?? existing.autoSubmit,
      targetUrl: changes.targetUrl !== undefined ? changes.targetUrl : existing.targetUrl,
    });
    const action = applyInput(existing, updated);
    await this.save(actions.map((current) => (current.id === id ? action : current)));
    return action;
  }

  async delete(id: string): Promise<boolean> {
    const actions = await this.load();
    if (!actions.some((action) => action.id === id)) {
      return false;
    }
    await this.save(actions.filter((action) => action.id !== id));
    return true;
  }

  async reorder(ids: string[]): Promise<Action[]> {
    const actions = await this.load();
    const byId = new Map(actions.map((action) => [action.id, action]));
    const ordered = [
      ...ids.map((id) => byId.get(id)).filter((action): action is Action => action !== undefined),
      ...actions.filter((action) => !ids.includes(action.id)),
    ];
    return this.save(ordered);
  }
}
