import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectFilesPanel } from './ProjectFilesPanel';

describe('ProjectFilesPanel', () => {
  it('renders with the correct aria label', () => {
    render(<ProjectFilesPanel />);

    expect(
      screen.getByLabelText(/project files/i, { selector: 'aside' })
    ).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(<ProjectFilesPanel />);

    expect(
      screen.getByRole('heading', { name: /project files/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/no project loaded/i)).toBeInTheDocument();
  });
});
