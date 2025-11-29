import { Conversation } from '@elevenlabs/client';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking';

export interface VoiceControllerConfig {
  agentId: string;
  apiKey: string;
  onStatusChange?: (status: VoiceStatus) => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export class VoiceController {
  private conversation: Awaited<ReturnType<typeof Conversation.startSession>> | null = null;
  private status: VoiceStatus = 'idle';
  private config: VoiceControllerConfig | null = null;
  private mediaStream: MediaStream | null = null;

  async start(config: VoiceControllerConfig): Promise<void> {
    if (this.conversation) {
      console.warn('[Voice] Conversation already active');
      return;
    }

    this.config = config;
    this.updateStatus('connecting');

    try {
      // Request microphone permission
      console.log('[Voice] Requesting microphone permission...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Voice] Microphone permission granted');

      // Start ElevenLabs session
      console.log('[Voice] Starting ElevenLabs session with agent:', config.agentId);
      
      // Build session options
      const sessionOptions: any = {
        agentId: config.agentId,
        
        onConnect: () => {
          console.log('[Voice] Connected to agent');
          this.updateStatus('connected');
        },
        
        onDisconnect: (details: any) => {
          console.log('[Voice] Disconnected from agent:', details);
          this.updateStatus('idle');
          this.conversation = null;
        },
        
        onError: (error: any) => {
          console.error('[Voice] Agent error:', error);
          if (this.config?.onError) {
            this.config.onError(error);
          }
        },
        
        onMessage: (message: any) => {
          console.log('[Voice] Message:', message);
          if (this.config?.onMessage) {
            this.config.onMessage(message);
          }
        },
        
        onStatusChange: (status: any) => {
          console.log('[Voice] Status:', status);
          // Map ElevenLabs status to our status
          if (status?.mode === 'listening') {
            this.updateStatus('listening');
          } else if (status?.mode === 'speaking') {
            this.updateStatus('speaking');
          }
        },
      };

      // Add API key if provided
      if (config.apiKey) {
        sessionOptions.apiKey = config.apiKey;
      }

      // Start conversation
      this.conversation = await Conversation.startSession(sessionOptions);

      this.updateStatus('listening');
      console.log('[Voice] Session started, ready to listen');
      
    } catch (error) {
      console.error('[Voice] Failed to start session:', error);
      this.updateStatus('idle');
      if (this.config?.onError) {
        this.config.onError(error);
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Stop media stream first
    if (this.mediaStream) {
      console.log('[Voice] Releasing microphone...');
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log('[Voice] Stopped track:', track.kind);
      });
      this.mediaStream = null;
    }

    // Then stop conversation
    if (this.conversation) {
      try {
        console.log('[Voice] Stopping conversation...');
        await this.conversation.endSession();
        console.log('[Voice] Conversation stopped');
      } catch (error) {
        console.error('[Voice] Error stopping conversation:', error);
      } finally {
        this.conversation = null;
        this.updateStatus('idle');
      }
    }
  }

  private updateStatus(status: VoiceStatus): void {
    this.status = status;
    if (this.config?.onStatusChange) {
      this.config.onStatusChange(status);
    }
  }

  isActive(): boolean {
    return this.conversation !== null;
  }

  getStatus(): VoiceStatus {
    return this.status;
  }
}

