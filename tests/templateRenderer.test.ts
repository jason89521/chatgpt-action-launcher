import { describe, expect, it } from 'vitest';
import { renderPromptTemplate } from '../src/templates/templateRenderer';

describe('renderPromptTemplate', () => {
  it('renders each supported browser-context variable', () => {
    expect(
      renderPromptTemplate('Review {{url}} titled {{title}} with {{selection}}.', {
        url: 'https://example.com/article',
        title: 'An article',
        selection: 'Selected text',
      }),
    ).toBe('Review https://example.com/article titled An article with Selected text.');
  });

  it('replaces repeated variables and preserves surrounding text', () => {
    expect(
      renderPromptTemplate('{{title}}: {{title}}\n{{selection}}', {
        title: 'A title',
        selection: 'Some text',
      }),
    ).toBe('A title: A title\nSome text');
  });

  it('renders missing and empty values as empty strings', () => {
    expect(
      renderPromptTemplate('{{url}}|{{title}}|{{selection}}', {
        url: '',
        title: undefined,
      }),
    ).toBe('||');
  });

  it('throws when the template contains an unknown variable', () => {
    expect(() => renderPromptTemplate('Review {{author}}', {})).toThrow(
      'Unknown prompt template variable: author',
    );
  });

  it('throws when the template contains an empty variable name', () => {
    expect(() => renderPromptTemplate('Review {{}}', {})).toThrow(
      'Unknown prompt template variable:',
    );
  });
});
