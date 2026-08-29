import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorActionButton } from './EditorPanel';

describe('EditorActionButton', () => {
  it('forwards refs to the underlying button element', () => {
    const ref = React.createRef<HTMLButtonElement>();

    render(<EditorActionButton icon={<span>i</span>} label='Test action' ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByRole('button', { name: /test action/i })).toBe(ref.current);
  });
});
