import {
  launchPromptInNewChatGPTTab,
  type ChatGPTLaunchRequest,
  type ChatGPTLaunchResponse,
} from '../src/chatgpt/chatgptAdapter';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isLaunchRequest(message)) {
      return undefined;
    }
    return handleLaunchRequest(message);
  });
});

async function handleLaunchRequest(request: ChatGPTLaunchRequest): Promise<ChatGPTLaunchResponse> {
  try {
    await launchPromptInNewChatGPTTab(request.prompt, request.autoSubmit, undefined, {
      targetUrl: request.targetUrl,
    });
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The ChatGPT composer could not be used.',
    };
  }
}

function isLaunchRequest(message: unknown): message is ChatGPTLaunchRequest {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const candidate = message as Record<string, unknown>;
  return (
    candidate.type === 'chatgpt:request-launch' &&
    typeof candidate.prompt === 'string' &&
    typeof candidate.autoSubmit === 'boolean'
  );
}
