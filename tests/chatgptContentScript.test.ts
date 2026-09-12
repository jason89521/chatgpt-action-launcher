import { describe, expect, it } from 'vitest';
import {
  clearChatGPTLaunchError,
  handleChatGPTLaunchMessage,
  populateChatGPTComposer,
  showChatGPTLaunchError,
} from '../src/chatgpt/chatgptContentScript';

describe('populateChatGPTComposer', () => {
  it('populates a contenteditable composer without submitting when disabled', () => {
    document.body.innerHTML = '<div contenteditable="true"></div><button data-testid="send-button"></button>';
    const composer = document.querySelector('[contenteditable="true"]')!;
    let inputEvents = 0;
    composer.addEventListener('input', () => { inputEvents += 1; });

    expect(populateChatGPTComposer(document, 'Line one\nLine two', false)).toEqual({ ok: true });
    expect(composer.textContent).toBe('Line one\nLine two');
    expect(inputEvents).toBe(1);
  });

  it('clicks the send button when auto-submit is enabled', () => {
    document.body.innerHTML = '<textarea aria-label="Message"></textarea><button aria-label="Send prompt"></button>';
    const sendButton = document.querySelector('button')!;
    let clicks = 0;
    sendButton.addEventListener('click', () => { clicks += 1; });

    expect(populateChatGPTComposer(document, 'Submit this', true)).toEqual({ ok: true });
    expect(document.querySelector('textarea')?.value).toBe('Submit this');
    expect(clicks).toBe(1);
  });

  it('reports a failure when the composer is unavailable', () => {
    document.body.innerHTML = '';

    expect(populateChatGPTComposer(document, 'Prompt', false)).toEqual({
      ok: false,
      error: 'The ChatGPT composer is not ready.',
    });
  });

  it('shows an extension-owned dismissible error notice', () => {
    document.body.innerHTML = '';

    showChatGPTLaunchError(document, 'The ChatGPT composer is not ready.');

    const notice = document.querySelector('[role="alert"]');
    expect(notice).toHaveTextContent('ChatGPT Action Launcher');
    expect(notice).toHaveTextContent('The ChatGPT composer is not ready.');

    document.querySelector<HTMLButtonElement>('button')?.click();
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('replaces a previous error notice without exposing prompt contents', () => {
    showChatGPTLaunchError(document, 'The ChatGPT send button is not ready.');

    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(document.body).not.toHaveTextContent('Prompt');
  });

  it('clears a previous error notice after a later successful launch', () => {
    showChatGPTLaunchError(document, 'The ChatGPT composer is not ready.');

    clearChatGPTLaunchError(document);

    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('does not report success when auto-submit has no usable send button', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';

    expect(populateChatGPTComposer(document, 'Prompt', true)).toEqual({
      ok: false,
      error: 'The ChatGPT send button is not ready.',
    });
  });

  it('shows a failure notice when the launch message cannot submit', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';

    expect(
      handleChatGPTLaunchMessage(document, {
        type: 'chatgpt:launch-prompt',
        prompt: 'Prompt',
        autoSubmit: true,
      }),
    ).toEqual({ ok: false, error: 'The ChatGPT send button is not ready.' });
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(
      'The ChatGPT send button is not ready.',
    );
  });

  it('does not leave a failure notice after a successful launch message', () => {
    showChatGPTLaunchError(document, 'A previous launch failed.');
    document.body.innerHTML += '<textarea aria-label="Message"></textarea>';

    expect(
      handleChatGPTLaunchMessage(document, {
        type: 'chatgpt:launch-prompt',
        prompt: 'Prompt',
        autoSubmit: false,
      }),
    ).toEqual({ ok: true });
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});
