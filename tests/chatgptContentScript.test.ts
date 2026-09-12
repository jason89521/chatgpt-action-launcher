import { describe, expect, it } from 'vitest';
import {
  clearChatGPTLaunchError,
  handleChatGPTLaunchMessage,
  showChatGPTLaunchError,
  submitChatGPTPrompt,
} from '../src/chatgpt/chatgptContentScript';

describe('submitChatGPTPrompt', () => {
  it('clicks the send button when auto-submit is enabled', () => {
    document.body.innerHTML = '<textarea aria-label="Message">Prefilled prompt</textarea><button aria-label="Send prompt"></button>';
    const sendButton = document.querySelector('button')!;
    let clicks = 0;
    sendButton.addEventListener('click', () => { clicks += 1; });

    expect(submitChatGPTPrompt(document)).toEqual({ ok: true });
    expect(document.querySelector('textarea')?.value).toBe('Prefilled prompt');
    expect(clicks).toBe(1);
  });

  it('prefers an explicit send button over an earlier unrelated send-labelled button', () => {
    document.body.innerHTML = `
      <div id="prompt-textarea" contenteditable="true"></div>
      <button aria-label="Send feedback"></button>
      <button data-testid="send-button"></button>
    `;
    const sendButton = document.querySelector<HTMLButtonElement>('[data-testid="send-button"]')!;
    let clicks = 0;
    sendButton.addEventListener('click', () => { clicks += 1; });

    expect(submitChatGPTPrompt(document)).toEqual({ ok: true });
    expect(clicks).toBe(1);
  });

  it('does not treat an unrelated send-labelled button as the submit control', () => {
    document.body.innerHTML = '<button aria-label="Send feedback"></button>';

    expect(submitChatGPTPrompt(document)).toEqual({
      ok: false,
      error: 'The ChatGPT send button is not ready.',
    });
  });

  it('does not submit the same document twice', () => {
    document.body.innerHTML = '<button data-testid="send-button"></button>';
    const sendButton = document.querySelector('button')!;
    let clicks = 0;
    sendButton.addEventListener('click', () => { clicks += 1; });

    expect(submitChatGPTPrompt(document)).toEqual({ ok: true });
    expect(submitChatGPTPrompt(document)).toEqual({ ok: true });
    expect(clicks).toBe(1);
  });

  it('reports a failure when the composer is unavailable', () => {
    document.body.innerHTML = '';

    expect(submitChatGPTPrompt(document)).toEqual({
      ok: false,
      error: 'The ChatGPT send button is not ready.',
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

    expect(submitChatGPTPrompt(document)).toEqual({
      ok: false,
      error: 'The ChatGPT send button is not ready.',
    });
  });

  it('shows a failure notice when the launch message cannot submit', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';

    expect(
      handleChatGPTLaunchMessage(document, {
        type: 'chatgpt:submit-prompt',
      }),
    ).toEqual({ ok: false, error: 'The ChatGPT send button is not ready.' });
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(
      'The ChatGPT send button is not ready.',
    );
  });

  it('does not leave a failure notice after a successful launch message', () => {
    showChatGPTLaunchError(document, 'A previous launch failed.');
    document.body.innerHTML += '<button data-testid="send-button"></button>';

    expect(
      handleChatGPTLaunchMessage(document, {
        type: 'chatgpt:submit-prompt',
      }),
    ).toEqual({ ok: true });
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});
