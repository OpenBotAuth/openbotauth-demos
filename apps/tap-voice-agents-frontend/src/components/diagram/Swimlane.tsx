import { ParticipantType } from '../../types';

interface SwimlaneProps {
  participant: ParticipantType;
  label: string;
  children?: React.ReactNode;
}

export default function Swimlane({ label, children }: SwimlaneProps) {
  return (
    <div className="swimlane">
      <div className="swimlane-header">{label}</div>
      <div className="swimlane-content">
        {children}
      </div>
    </div>
  );
}

