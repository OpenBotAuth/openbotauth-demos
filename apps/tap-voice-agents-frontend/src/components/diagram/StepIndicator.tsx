interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export default function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  const completedSteps = currentStep;
  const pendingSteps = totalSteps - currentStep;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-300">
          Currently: Step {currentStep + 1} - {stepLabels[currentStep] || 'Complete'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="badge badge-success">✓ {completedSteps} complete</div>
        </div>
        {pendingSteps > 0 && (
          <div className="flex items-center gap-2">
            <div className="badge badge-warning">⏳ {pendingSteps} pending</div>
          </div>
        )}
      </div>
    </div>
  );
}

