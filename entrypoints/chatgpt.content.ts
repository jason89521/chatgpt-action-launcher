import { populateChatGPTComposer } from '../src/chatgpt/chatgptContentScript';
import type { ChatGPTLaunchMessage } from '../src/chatgpt/chatgptAdapter';

export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isLaunchMessage(message)) {
        return undefined;
      }
      return Promise.resolve(
        populateChatGPTComposer(document, message.prompt, message.autoSubmit),
      );
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
