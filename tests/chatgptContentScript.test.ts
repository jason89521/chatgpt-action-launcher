import { describe, expect, it } from 'vitest';
import { populateChatGPTComposer } from '../src/chatgpt/chatgptContentScript';

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

  it('reports a visible failure when the composer is unavailable', () => {
    document.body.innerHTML = '';

    expect(populateChatGPTComposer(document, 'Prompt', false)).toEqual({
      ok: false,
      error: 'The ChatGPT composer is not ready.',
    });
  });

  it('does not report success when auto-submit has no usable send button', () => {
    document.body.innerHTML = '<div contenteditable="true"></div>';

    expect(populateChatGPTComposer(document, 'Prompt', true)).toEqual({
      ok: false,
      error: 'The ChatGPT send button is not ready.',
    });
  });
});
