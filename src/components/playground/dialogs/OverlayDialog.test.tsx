import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OverlayDialog from './OverlayDialog';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('../MonacoEditor', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: string) => void;
    language?: string;
    height?: string;
  }) => (
    <textarea data-testid='monaco-mock' value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('./JsonPathPickerDialog', () => ({
  default: () => null,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/importUrlClient', () => ({
  importTextFromUrl: vi.fn(),
}));

vi.mock('openapi-format', () => ({
  parseString: vi.fn(async (input: string) => JSON.parse(input)),
  stringify: vi.fn(async (input: unknown) => JSON.stringify(input, null, 2)),
  resolveJsonPathValue: vi.fn(() => []),
}));

describe('OverlayDialog', () => {
  it('copy actions show from input and hide update editor', async () => {
    const overlaySet = JSON.stringify({
      actions: [{ target: '$.info.title', copy: true, from: '$.info.version' }],
    });

    render(
      <TooltipProvider>
        <OverlayDialog
          isOpen
          onClose={() => {}}
          overlaySet={overlaySet}
          openapi=''
          onSubmit={() => {}}
          format='json'
        />
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('From (JSONPath)')).toBeInTheDocument();
    });
    expect(screen.queryByText('Update Value')).not.toBeInTheDocument();
  });
});
