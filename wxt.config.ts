import { defineConfig } from 'wxt';
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ChatGPT Action Launcher',
    description: 'Launch reusable prompts in a new ChatGPT conversation.',
    host_permissions: ['https://chatgpt.com/*', 'https://chat.openai.com/*']
  }
});
