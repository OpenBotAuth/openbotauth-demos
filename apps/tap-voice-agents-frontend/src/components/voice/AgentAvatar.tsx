import { ActiveAgent } from '../../types';

interface AgentAvatarProps {
  agent: ActiveAgent;
  speaking: boolean;
}

export default function AgentAvatar({ agent, speaking }: AgentAvatarProps) {
  return (
    <div className={`voice-avatar ${agent} ${speaking ? 'speaking' : ''}`}>
      <div className="text-white text-2xl font-bold">
        {agent === 'pete' ? 'P' : 'P'}
      </div>
    </div>
  );
}

