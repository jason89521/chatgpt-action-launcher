import { handleChatGPTLaunchMessage } from '../src/chatgpt/chatgptContentScript';
import type {
  ChatGPTLaunchErrorMessage,
  ChatGPTLaunchMessage,
} from '../src/chatgpt/chatgptAdapter';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isLaunchMessage(message) && !isLaunchErrorMessage(message)) {
        return undefined;
      }
      return Promise.resolve(handleChatGPTLaunchMessage(document, message));
    });
  }
});

function isLaunchMessage(message: unknown): message is ChatGPTLaunchMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const candidate = message as Record<string, unknown>;
  return (
    candidate.type === 'chatgpt:launch-prompt' &&
    typeof candidate.prompt === 'string' &&
    typeof candidate.autoSubmit === 'boolean'
  );
}

function isLaunchErrorMessage(message: unknown): message is ChatGPTLaunchErrorMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const candidate = message as Record<string, unknown>;
  return candidate.type === 'chatgpt:launch-error' && typeof candidate.error === 'string';
}
