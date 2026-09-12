import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Popup from '../src/popup/Popup';

describe('popup', () => {
  it('renders the launcher placeholder', () => {
    render(<Popup />);

    expect(screen.getByRole('heading', { name: 'ChatGPT Action Launcher' })).toBeInTheDocument();
    expect(screen.getByText('Your reusable actions will appear here.')).toBeInTheDocument();
  });
});
