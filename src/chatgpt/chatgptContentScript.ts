import type { ChatGPTLaunchResponse } from './chatgptAdapter';

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
