export default defineContentScript({
  matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
  runAt: 'document_idle',
  main() {
    // ChatGPT DOM automation will be implemented in a later issue.
  }
});
