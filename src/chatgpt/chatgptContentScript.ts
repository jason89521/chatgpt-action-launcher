import type {
  ChatGPTLaunchErrorMessage,
  ChatGPTLaunchMessage,
  ChatGPTLaunchResponse,
} from './chatgptAdapter';

const ERROR_NOTICE_ID = 'chatgpt-action-launcher-error';
const ERROR_NOTICE_STYLE_ID = 'chatgpt-action-launcher-error-style';

export function handleChatGPTLaunchMessage(
  documentRoot: Document,
  message: ChatGPTLaunchMessage | ChatGPTLaunchErrorMessage,
): ChatGPTLaunchResponse | undefined {
  if (message.type === 'chatgpt:launch-error') {
    showChatGPTLaunchError(documentRoot, message.error);
    return undefined;
  }

  const response = populateChatGPTComposer(documentRoot, message.prompt, message.autoSubmit);
  if (!response.ok) {
    showChatGPTLaunchError(documentRoot, response.error ?? 'The ChatGPT launch failed.');
  } else {
    clearChatGPTLaunchError(documentRoot);
  }
  return response;
}

export function populateChatGPTComposer(
  documentRoot: Document,
  prompt: string,
  autoSubmit: boolean,
): ChatGPTLaunchResponse {
  const composer = documentRoot.querySelector<HTMLElement>(
    '[contenteditable="true"], textarea[placeholder*="Message"], textarea[aria-label*="Message"]',
  );
  if (!composer) {
    return { ok: false, error: 'The ChatGPT composer is not ready.' };
  }

  if (composer instanceof HTMLTextAreaElement) {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    valueSetter?.call(composer, prompt);
  } else {
    composer.replaceChildren(documentRoot.createTextNode(prompt));
  }
  composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));

  if (autoSubmit) {
    const sendButton = documentRoot.querySelector<HTMLButtonElement>(
      'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label*="Send"]',
    );
    if (!sendButton || sendButton.disabled) {
      return { ok: false, error: 'The ChatGPT send button is not ready.' };
    }
    sendButton.click();
  }

  return { ok: true };
}

export function showChatGPTLaunchError(documentRoot: Document, error: string): void {
  documentRoot.getElementById(ERROR_NOTICE_ID)?.remove();
  ensureErrorNoticeStyles(documentRoot);

  const notice = documentRoot.createElement('aside');
  notice.id = ERROR_NOTICE_ID;
  notice.className = 'chatgpt-action-launcher-error';
  notice.setAttribute('role', 'alert');
  notice.setAttribute('aria-live', 'assertive');

  const content = documentRoot.createElement('div');
  const title = documentRoot.createElement('strong');
  title.textContent = 'ChatGPT Action Launcher';
  const message = documentRoot.createElement('p');
  message.textContent = error;
  content.append(title, message);

  const dismissButton = documentRoot.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'chatgpt-action-launcher-error-dismiss';
  dismissButton.setAttribute('aria-label', 'Dismiss error');
  dismissButton.textContent = 'Dismiss';
  dismissButton.addEventListener('click', () => notice.remove());

  notice.append(content, dismissButton);
  (documentRoot.body ?? documentRoot.documentElement).append(notice);
}

export function clearChatGPTLaunchError(documentRoot: Document): void {
  documentRoot.getElementById(ERROR_NOTICE_ID)?.remove();
}

function ensureErrorNoticeStyles(documentRoot: Document): void {
  if (documentRoot.getElementById(ERROR_NOTICE_STYLE_ID)) {
    return;
  }

  const style = documentRoot.createElement('style');
  style.id = ERROR_NOTICE_STYLE_ID;
  style.textContent = `
    .chatgpt-action-launcher-error {
      align-items: flex-start;
      background: #fff7ed;
      border: 1px solid #fb923c;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      color: #7c2d12;
      display: flex;
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      gap: 16px;
      justify-content: space-between;
      max-width: min(420px, calc(100vw - 32px));
      padding: 16px;
      position: fixed;
      right: 16px;
      top: 16px;
      width: max-content;
      z-index: 2147483647;
    }

    .chatgpt-action-launcher-error strong,
    .chatgpt-action-launcher-error p {
      display: block;
      margin: 0;
    }

    .chatgpt-action-launcher-error p {
      margin-top: 4px;
    }

    .chatgpt-action-launcher-error-dismiss {
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 6px;
      color: inherit;
      cursor: pointer;
      flex: 0 0 auto;
      padding: 4px 8px;
    }
  `;
  (documentRoot.head ?? documentRoot.documentElement).append(style);
}
