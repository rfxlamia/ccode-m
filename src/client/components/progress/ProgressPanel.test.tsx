import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';

describe('ProgressPanel', () => {
  it('renders with the correct aria label', () => {
    render(<ProgressPanel />);

    expect(
      screen.getByLabelText(/progress and artifacts/i, { selector: 'aside' })
    ).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    render(<ProgressPanel />);

    expect(
      screen.getByRole('heading', { name: /progress/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/no tasks in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/no artifacts yet/i)).toBeInTheDocument();
  });
});
