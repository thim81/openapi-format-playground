import React from 'react';
import { Button } from '@/components/ui/button';
import type { AnswerAction } from './types';

interface ActionButtonsProps {
  actions: AnswerAction[];
  onActionClick: (action: AnswerAction) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ actions, onActionClick }) => (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {actions.map((action, i) => (
      <Button
        key={i}
        variant={action.variant || 'outline'}
        size="sm"
        className="h-7 text-xs rounded-full px-3"
        onClick={() => onActionClick(action)}
      >
        {action.label}
      </Button>
    ))}
  </div>
);

export default ActionButtons;
