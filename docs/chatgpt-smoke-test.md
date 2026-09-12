# ChatGPT adapter smoke test

Use a development build loaded as an unpacked Chromium extension and run each
check from a normal page through the popup action launcher.

1. Create or select an action with `autoSubmit` disabled and launch it with a
   multiline prompt.
2. Repeat with Chinese text, emoji, and a URL in the prompt template.
3. Launch a longer prompt and confirm the full text appears in the new
   conversation composer without truncation.
4. Confirm `autoSubmit=false` fills the composer but does not send the prompt.
5. Confirm `autoSubmit=true` fills the composer and sends the prompt exactly
   once.
6. Reload the ChatGPT tab and repeat the checks after the page has settled.

If a check fails, record the browser version, ChatGPT URL, visible composer
markup, and whether the failure occurred while filling or sending. Do not
include the prompt text or conversation contents in logs or issue reports.
