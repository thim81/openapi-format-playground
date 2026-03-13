import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MetricsBar from './MetricsBar';

describe('MetricsBar', () => {
  it('renders the top close control as a full-width bar when expanded', () => {
    render(
      <MetricsBar
        totalPaths={1}
        totalTags={1}
        totalComponents={1}
        totalUnusedComponents={0}
        components={undefined}
        unusedComponents={undefined}
        totalActions={0}
        totalUsedActions={0}
        totalUnusedActions={0}
        usedActions={[]}
        unusedActions={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.getByRole('button', { name: /close/i })).toHaveClass('w-full');
  });
});
