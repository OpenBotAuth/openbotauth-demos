import { SequenceStep as SequenceStepType } from '../../types';

interface SequenceStepProps {
  step: SequenceStepType;
  fromX: number;
  toX: number;
  y: number;
}

export default function SequenceStep({ step, fromX, toX, y }: SequenceStepProps) {
  const isActive = step.status === 'active';
  const isCompleted = step.status === 'completed';
  const isError = step.status === 'error';

  let strokeColor = 'var(--color-border)'; // pending
  if (isActive) strokeColor = 'var(--color-accent)';
  if (isCompleted) strokeColor = 'var(--color-success)';
  if (isError) strokeColor = 'var(--color-error)';

  const markerEnd = isCompleted ? 'url(#arrowhead-completed)' : 
                    isError ? 'url(#arrowhead-error)' :
                    'url(#arrowhead)';

  return (
    <g className={isActive ? 'sequence-step-active' : ''}>
      {/* Arrow line */}
      <line
        x1={fromX}
        y1={y}
        x2={toX}
        y2={y}
        stroke={strokeColor}
        strokeWidth="2"
        strokeDasharray={step.status === 'pending' ? '5,5' : '0'}
        className={isActive || isCompleted ? 'sequence-step-arrow' : ''}
        markerEnd={markerEnd}
      />
      
      {/* Label */}
      <text
        x={(fromX + toX) / 2}
        y={y - 10}
        textAnchor="middle"
        fill="var(--color-text)"
        fontSize="12"
        className="font-mono"
      >
        {step.label}
      </text>

      {/* Status indicator */}
      {isCompleted && (
        <circle cx={toX} cy={y} r="8" fill="var(--color-success)" />
      )}
      {isError && (
        <circle cx={toX} cy={y} r="8" fill="var(--color-error)" />
      )}
    </g>
  );
}

