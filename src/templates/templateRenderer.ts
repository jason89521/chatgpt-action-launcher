export interface PromptTemplateContext {
  url?: string;
  title?: string;
  selection?: string;
}

const supportedVariables = new Set<keyof PromptTemplateContext>([
  'url',
  'title',
  'selection',
]);

/**
 * Renders supported prompt template variables.
 *
 * Missing and empty context values become empty strings. Unknown variables
 * throw so a typo cannot silently change the meaning of a prompt.
 */
export function renderPromptTemplate(
  template: string,
  context: PromptTemplateContext,
): string {
  return template.replace(/{{\s*([^{}]*?)\s*}}/g, (_, rawVariableName: string) => {
    const variableName = rawVariableName.trim();

    if (!supportedVariables.has(variableName as keyof PromptTemplateContext)) {
      throw new Error(`Unknown prompt template variable: ${variableName}`);
    }

    return context[variableName as keyof PromptTemplateContext] ?? '';
  });
}
