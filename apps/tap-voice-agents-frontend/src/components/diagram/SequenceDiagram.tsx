import { useState, useEffect, useRef } from 'react';
import { SequenceStep as SequenceStepType } from '../../types';

interface SequenceDiagramProps {
  steps: SequenceStepType[];
  activeStep: number;
  expanded: boolean;
}

const PARTICIPANTS = [
  { id: 'agent', label: 'Agent', color: '#8b5cf6' },
  { id: 'merchant', label: 'Merchant', color: '#3b82f6' },
  { id: 'oba-verifier', label: 'OBA Verifier', color: '#10b981' },
  { id: 'oba-registry', label: 'OBA Registry', color: '#f59e0b' },
  { id: 'visa', label: 'Visa Mock', color: '#ef4444' },
];

export default function SequenceDiagram({ steps, activeStep, expanded }: SequenceDiagramProps) {
  const [showStepList, setShowStepList] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Force expanded if we have steps
  const isExpanded = expanded || steps.length > 0;
  
  const completedSteps = steps.filter(s => s.status === 'completed').length;

  // Auto-scroll to show new steps as they appear - slow and demo-friendly
  useEffect(() => {
    if (steps.length > 0 && svgContainerRef.current) {
      const container = svgContainerRef.current;
      const stepHeight = 80; // Approximate height per step
      const targetScroll = Math.max(0, (steps.length - 3) * stepHeight); // Keep 3 steps visible
      
      // Delay scroll slightly to let step render
      const scrollTimeout = setTimeout(() => {
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }, 300);

      return () => clearTimeout(scrollTimeout);
    }
  }, [steps.length]); // Trigger on new steps
  
  // Final scroll when all steps complete
  useEffect(() => {
    if (completedSteps > 0 && completedSteps === steps.length && svgContainerRef.current) {
      const container = svgContainerRef.current;
      
      // Slowly scroll to bottom to show all completed steps
      const finalScrollTimeout = setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 1000);

      return () => clearTimeout(finalScrollTimeout);
    }
  }, [completedSteps, steps.length]);

  // Calculate participant positions - compact layout to avoid horizontal scrolling
  const participantWidth = 140;
  const participantGap = 40;
  const totalWidth = (PARTICIPANTS.length * participantWidth) + ((PARTICIPANTS.length - 1) * participantGap);
  
  const getParticipantX = (participantId: string): number => {
    const index = PARTICIPANTS.findIndex(p => p.id === participantId);
    if (index === -1) return 0;
    return (index * (participantWidth + participantGap)) + (participantWidth / 2);
  };

  return (
    <div className={`transition-all duration-500 ${isExpanded ? 'min-h-[70vh]' : 'h-[20vh]'}`}>
      <div className="h-full bg-slate-900/50 rounded-lg p-6">
        {isExpanded ? (
          <>
            {/* Header with step counter and expand button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-slate-300">
                  Payment Flow: {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
                </h3>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                  ✓ {completedSteps} of {steps.length} COMPLETE
                </span>
              </div>
              
              <button
                onClick={() => setShowStepList(!showStepList)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                {showStepList ? '▼ Hide Steps' : '▶ Show Steps'}
              </button>
            </div>

            {/* Expandable step list */}
            {showStepList && (
              <div className="mb-6 bg-slate-800/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Step Timeline</h4>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        index === activeStep ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      <span className="text-slate-500 text-sm w-8">{index + 1}.</span>
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        step.status === 'completed' ? 'bg-emerald-500' :
                        step.status === 'error' ? 'bg-red-500' :
                        step.status === 'active' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-600'
                      }`} />
                      <span className="text-sm text-slate-300 flex-1">{step.label}</span>
                      <span className="text-xs text-slate-500">{step.from} → {step.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sequence Diagram Container - Scrollable */}
            <div 
              ref={svgContainerRef}
              className="relative overflow-y-auto" 
              style={{ 
                width: '100%', 
                height: '60vh' // Fixed height to enable scrolling
              }}
            >
              {/* Participant Headers */}
              <div 
                className="flex justify-between mb-4" 
                style={{ 
                  width: `${totalWidth}px`, 
                  margin: '0 auto',
                  paddingLeft: `${participantWidth / 2}px`,
                  paddingRight: `${participantWidth / 2}px`
                }}
              >
                {PARTICIPANTS.map((participant) => (
                  <div 
                    key={participant.id} 
                    className="text-center"
                    style={{ width: `${participantWidth}px` }}
                  >
                    <div 
                      className="px-4 py-3 rounded-lg font-semibold text-sm"
                      style={{ 
                        backgroundColor: `${participant.color}20`,
                        color: participant.color,
                        border: `2px solid ${participant.color}40`
                      }}
                    >
                      {participant.label.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>

              {/* SVG for sequence flow */}
              <svg 
                width="100%" 
                height={Math.max(500, steps.length * 100 + 100)}
                viewBox={`0 0 ${totalWidth} ${Math.max(500, steps.length * 100 + 100)}`}
                preserveAspectRatio="xMidYMin meet"
                style={{ display: 'block', margin: '0 auto' }}
              >
                <defs>
                  {/* Arrow markers */}
                  <marker
                    id="arrow-blue"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                  <marker
                    id="arrow-green"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                  </marker>
                  <marker
                    id="arrow-red"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>

                {/* Vertical lifelines for each participant */}
                {PARTICIPANTS.map((participant) => {
                  const x = getParticipantX(participant.id);
                  return (
                    <line
                      key={participant.id}
                      x1={x}
                      y1={20}
                      x2={x}
                      y2={Math.max(500, steps.length * 100 + 80)}
                      stroke="#475569"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.3"
                    />
                  );
                })}

                {/* Render each step as an arrow */}
                {steps.map((step, index) => {
                  const fromX = getParticipantX(step.from);
                  const toX = getParticipantX(step.to);
                  const y = 60 + (index * 100);
                  
                  const color = step.status === 'completed' ? '#10b981' :
                                step.status === 'error' ? '#ef4444' :
                                step.status === 'active' ? '#3b82f6' : '#64748b';
                  
                  const marker = step.status === 'completed' ? 'url(#arrow-green)' :
                                 step.status === 'error' ? 'url(#arrow-red)' :
                                 'url(#arrow-blue)';

                  // Check if this is a self-call (from and to are the same)
                  const isSelfCall = step.from === step.to;

                  return (
                    <g key={step.id}>
                      {isSelfCall ? (
                        // Self-call: draw a loop-back arrow
                        <>
                          <path
                            d={`M ${fromX} ${y} 
                                L ${fromX + 40} ${y} 
                                L ${fromX + 40} ${y + 30} 
                                L ${fromX} ${y + 30}`}
                            stroke={color}
                            strokeWidth="2"
                            fill="none"
                            markerEnd={marker}
                            opacity={step.status === 'pending' ? 0.3 : 1}
                          />
                          
                          {/* Label to the right of the loop */}
                          <text
                            x={fromX + 50}
                            y={y + 15}
                            textAnchor="start"
                            fill="#cbd5e1"
                            fontSize="13"
                            fontFamily="monospace"
                          >
                            {step.label}
                          </text>
                        </>
                      ) : (
                        // Regular call: draw a straight arrow
                        <>
                          <line
                            x1={fromX}
                            y1={y}
                            x2={toX - 10}
                            y2={y}
                            stroke={color}
                            strokeWidth="2"
                            markerEnd={marker}
                            opacity={step.status === 'pending' ? 0.3 : 1}
                          />
                          
                          {/* Label above arrow */}
                          <text
                            x={(fromX + toX) / 2}
                            y={y - 12}
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize="13"
                            fontFamily="monospace"
                          >
                            {step.label}
                          </text>
                        </>
                      )}

                      {/* Status indicator at destination */}
                      {step.status === 'completed' && (
                        <g>
                          <circle 
                            cx={isSelfCall ? fromX : toX} 
                            cy={isSelfCall ? y + 30 : y} 
                            r="10" 
                            fill="#10b981" 
                            opacity="0.3" 
                          />
                          <circle 
                            cx={isSelfCall ? fromX : toX} 
                            cy={isSelfCall ? y + 30 : y} 
                            r="6" 
                            fill="#10b981" 
                          />
                          <text
                            x={isSelfCall ? fromX : toX}
                            y={isSelfCall ? y + 31 : y + 1}
                            textAnchor="middle"
                            fill="white"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            ✓
                          </text>
                        </g>
                      )}
                      
                      {step.status === 'error' && (
                        <g>
                          <circle 
                            cx={isSelfCall ? fromX : toX} 
                            cy={isSelfCall ? y + 30 : y} 
                            r="10" 
                            fill="#ef4444" 
                            opacity="0.3" 
                          />
                          <circle 
                            cx={isSelfCall ? fromX : toX} 
                            cy={isSelfCall ? y + 30 : y} 
                            r="6" 
                            fill="#ef4444" 
                          />
                          <text
                            x={isSelfCall ? fromX : toX}
                            y={isSelfCall ? y + 31 : y + 1}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            ✕
                          </text>
                        </g>
                      )}
                      
                      {step.status === 'active' && (
                        <circle 
                          cx={isSelfCall ? fromX : toX} 
                          cy={isSelfCall ? y + 30 : y} 
                          r="6" 
                          fill="#3b82f6"
                          className="animate-pulse"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400 text-center">
              Add items to cart and proceed to checkout to see the live payment flow<br />
              <span className="text-sm text-slate-500 mt-2">The sequence diagram will animate in real-time</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
