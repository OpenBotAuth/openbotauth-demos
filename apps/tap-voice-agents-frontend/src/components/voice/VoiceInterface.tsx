import { useState, useEffect, useRef } from 'react';
import { ActiveAgent } from '../../types';
import AgentAvatar from './AgentAvatar';
import Transcript from './Transcript';
import { VoiceController, VoiceStatus } from '../../services/voiceController';

interface VoiceInterfaceProps {
  activeAgent: ActiveAgent;
  onAgentSwitch?: (agent: ActiveAgent) => void;
  onStopRequested?: () => void;
  onCheckoutInitiated?: (checkoutId: string) => void;
  onPaymentStarted?: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';

// Use a fixed demo session ID to match backend
const getSessionId = () => {
  return 'demo-session'; // Match the backend's demo session
};

export default function VoiceInterface({ activeAgent, onAgentSwitch, onStopRequested, onCheckoutInitiated, onPaymentStarted }: VoiceInterfaceProps) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [conversationStarted, setConversationStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Array<{
    speaker: 'user' | 'agent';
    text: string;
    timestamp: number;
  }>>([]);

  const controllerRef = useRef<VoiceController | null>(null);
  const sessionId = getSessionId();

  const agentName = activeAgent === 'pete' ? 'Pete' : 'Penny';
  const agentRole = activeAgent === 'pete' ? 'Your Shopping Sub-Agent (via OpenBotAuth)' : 'Your Checkout Sub-Agent (via OpenBotAuth)';

  // Initialize controller once
  useEffect(() => {
    controllerRef.current = new VoiceController();
    return () => {
      controllerRef.current?.stop();
    };
  }, []);

  // Keep Penny's dialog open during payment phase

  // Load checkoutId from sessionStorage when switching to Penny
  useEffect(() => {
    if (activeAgent === 'penny' && !checkoutId) {
      const storedCheckoutId = sessionStorage.getItem('tap-checkout-id');
      if (storedCheckoutId) {
        console.log('[Checkout] Restored checkout ID from session:', storedCheckoutId);
        setCheckoutId(storedCheckoutId);
        setError(null); // Clear any previous errors
      }
    }
  }, [activeAgent, checkoutId]);

  // Handle agent changes - restart conversation with new agent
  useEffect(() => {
    if (conversationStarted && controllerRef.current?.isActive()) {
      console.log('[Voice] Agent changed, restarting conversation with', agentName);
      handleRestart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent]);

  const handleStart = async () => {
    if (!controllerRef.current) return;

    setError(null);
    
    try {
      const agentId = activeAgent === 'pete'
        ? import.meta.env.VITE_ELEVENLABS_CART_AGENT_ID
        : import.meta.env.VITE_ELEVENLABS_PAYMENT_AGENT_ID;
      
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      if (!agentId || !apiKey) {
        throw new Error('ElevenLabs credentials not configured in .env');
      }

      await controllerRef.current.start({
        agentId,
        apiKey,
        onStatusChange: setVoiceStatus,
        onMessage: (msg) => {
          if (msg.message) {
            setMessages(prev => [...prev, {
              speaker: 'agent',
              text: msg.message,
              timestamp: Date.now()
            }]);
            
            // Auto-disconnect Penny after "Thank you" message
            if (activeAgent === 'penny' && msg.message.toLowerCase().includes('thank you')) {
              console.log('[Voice] Penny said thank you - auto-disconnecting in 5s');
              setTimeout(() => {
                handleStop();
              }, 5000); // Give time for sequence diagram to complete
            }
          }
        },
        onError: (err) => {
          setError(err.message || 'Connection error');
        },
      });

      setConversationStarted(true);
    } catch (err: any) {
      console.error('[Voice] Start failed:', err);
      setError(err.message || 'Failed to start conversation');
      setVoiceStatus('idle');
    }
  };

  const handleStop = async () => {
    if (controllerRef.current) {
      await controllerRef.current.stop();
      setConversationStarted(false);
      if (onStopRequested) {
        onStopRequested();
      }
    }
  };

  const handleRestart = async () => {
    await handleStop();
    setTimeout(() => handleStart(), 500);
  };

  // Manual button handlers
  const handleManualAddItem = async () => {
    try {
      setMessages(prev => [...prev, {
        speaker: 'user',
        text: 'Add classic white shirt to cart',
        timestamp: Date.now()
      }]);

      const response = await fetch(`${BACKEND_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          item: {
            id: Date.now(),
            name: 'Classic White Shirt',
            price: 89,
            quantity: 1,
          }
        })
      });

      if (!response.ok) throw new Error('Failed to add item');
      
      const data = await response.json();
      console.log('[Cart] Item added:', data);
      
      setMessages(prev => [...prev, {
        speaker: 'agent',
        text: `Added classic white shirt to your cart. Total: $${data.total.toFixed(2)}`,
        timestamp: Date.now()
      }]);

      // Trigger cart refresh in parent
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: data }));
    } catch (err) {
      console.error('[Cart] Error adding item:', err);
      setError('Failed to add item to cart');
    }
  };

  const handleManualCheckout = async () => {
    try {
      setMessages(prev => [...prev, {
        speaker: 'user',
        text: 'Ready to checkout',
        timestamp: Date.now()
      }]);

      const response = await fetch(`${BACKEND_URL}/api/checkout/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: 'demo-user'
        })
      });

      if (!response.ok) throw new Error('Failed to initiate checkout');
      
      const data = await response.json();
      console.log('[Checkout] Initiated:', data);
      
      // Store checkoutId in both state AND sessionStorage so it persists across agent switch
      setCheckoutId(data.checkoutId);
      sessionStorage.setItem('tap-checkout-id', data.checkoutId);
      
      setMessages(prev => [...prev, {
        speaker: 'agent',
        text: 'Handing you off to Penny for payment...',
        timestamp: Date.now()
      }]);

      // Notify parent to trigger transition
      if (onCheckoutInitiated) {
        onCheckoutInitiated(data.checkoutId);
      }

      // Switch to Penny after short delay
      setTimeout(() => {
        if (onAgentSwitch) {
          onAgentSwitch('penny');
        }
      }, 1000);
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setError('Failed to initiate checkout');
    }
  };

  const handleManualAuthorize = async () => {
    // Try to get checkoutId from state or sessionStorage
    const currentCheckoutId = checkoutId || sessionStorage.getItem('tap-checkout-id');
    
    if (!currentCheckoutId) {
      setError('No checkout session found');
      return;
    }
    
    // Update state if we got it from sessionStorage
    if (!checkoutId && currentCheckoutId) {
      setCheckoutId(currentCheckoutId);
    }

    try {
      setMessages(prev => [...prev, {
        speaker: 'user',
        text: 'Yes, I authorize this purchase',
        timestamp: Date.now()
      }]);

      console.log('[Payment] Using checkout ID:', currentCheckoutId);

      // Notify parent that payment is starting (to hide cart/voice UI)
      if (onPaymentStarted) {
        onPaymentStarted();
      }

      // 1. Capture consent
      const consentResponse = await fetch(`${BACKEND_URL}/api/checkout/consent/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: currentCheckoutId,
          transcript: 'Yes, I authorize this purchase',
          audioHash: 'manual-auth-' + Date.now(),
          timestamp: Date.now()
        })
      });

      if (!consentResponse.ok) throw new Error('Failed to capture consent');
      
      const consentData = await consentResponse.json();
      console.log('[Consent] Captured:', consentData);

      setMessages(prev => [...prev, {
        speaker: 'agent',
        text: 'Processing your payment...',
        timestamp: Date.now()
      }]);

      // 2. Execute payment (this will trigger the full TAP flow with SSE events)
      const paymentResponse = await fetch(`${BACKEND_URL}/api/payment/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: currentCheckoutId,
          paymentToken: 'tok_visa_4242',
          userIdentifier: 'demo-user@example.com'
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Payment failed');
      }
      
      const paymentData = await paymentResponse.json();
      console.log('[Payment] Success:', paymentData);

      setMessages(prev => [...prev, {
        speaker: 'agent',
        text: `Payment successful! Order ID: ${paymentData.orderId}`,
        timestamp: Date.now()
      }]);
    } catch (err: any) {
      console.error('[Payment] Error:', err);
      setError(err.message || 'Failed to process payment');
      setMessages(prev => [...prev, {
        speaker: 'agent',
        text: 'Sorry, there was an error processing your payment.',
        timestamp: Date.now()
      }]);
    }
  };

  const speaking = voiceStatus === 'speaking';
  const isAudioActive = controllerRef.current?.isActive() || false;

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed left-6 bottom-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="card-glass px-6 py-4 flex items-center gap-3 hover:scale-105 transition-transform"
        >
          <AgentAvatar agent={activeAgent} speaking={speaking} />
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-100">{agentName}</div>
            <div className="text-xs text-slate-400">Click to expand</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-6 bottom-6 z-50 max-h-[calc(100vh-3rem)] flex flex-col">
      <div className="card-glass max-w-md min-w-[380px] overflow-y-auto flex-1 flex flex-col">
        {/* Agent Avatar and Info with Close Button */}
        <div className="flex items-center gap-4 mb-4">
          <AgentAvatar agent={activeAgent} speaking={speaking} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-100">{agentName}</h3>
            <p className="text-sm text-slate-400">{agentRole}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`badge ${
              voiceStatus === 'speaking' ? 'badge-success' : 
              voiceStatus === 'listening' || voiceStatus === 'connected' ? 'badge-info' :
              voiceStatus === 'connecting' ? 'badge-warning' : 'badge-info'
            }`}>
              {voiceStatus === 'connecting' ? 'Connecting...' :
               voiceStatus === 'speaking' ? 'Speaking' :
               voiceStatus === 'listening' ? 'Listening' :
               voiceStatus === 'connected' ? 'Connected' : 'Idle'}
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              title="Minimize"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Voice Controls */}
        {!conversationStarted && (
          <div className="text-center py-3 border-b border-slate-700/50">
            <button 
              onClick={handleStart}
              disabled={voiceStatus === 'connecting'}
              className="btn-secondary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <span>{voiceStatus === 'connecting' ? '🔄' : '🎤'}</span>
              <span>{voiceStatus === 'connecting' ? 'Connecting...' : `Use Voice with ${agentName}`}</span>
            </button>
            <p className="text-xs text-slate-400 mt-1">
            Runs in your wallet / extension – embedded here for demo.
            </p>
          </div>
        )}

        {conversationStarted && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <div className="text-sm text-slate-300 mb-3 flex-shrink-0">
              {activeAgent === 'pete' ? (
                <p className="flex items-center gap-2">
                  <span>💬</span>
                  <span>Say "Add [item] to cart" or "I'm ready to checkout"</span>
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <span>💬</span>
                  <span>Say "Yes" to authorize the payment</span>
                </p>
              )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto">
              <Transcript messages={messages} />
            </div>

            {/* Stop Button */}
            {isAudioActive && (
              <div className="mt-4 flex-shrink-0">
                <button
                  onClick={handleStop}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <span>⏹️</span>
                  <span>Stop Voice</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Control Panel - ALWAYS VISIBLE */}
        <div className="mt-auto pt-4 border-t border-slate-700/50 flex-shrink-0">
          <p className="text-xs text-slate-400 mb-3">
            {conversationStarted ? 'Or use manual controls:' : 'Manual Controls:'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {activeAgent === 'pete' ? (
              <>
                <button
                  onClick={handleManualAddItem}
                  className="btn-secondary text-sm"
                >
                  Add Item
                </button>
                <button
                  onClick={handleManualCheckout}
                  className="btn-primary text-sm col-span-2"
                >
                  Checkout
                </button>
              </>
            ) : (
              <button
                onClick={handleManualAuthorize}
                className="btn-primary text-sm col-span-2"
              >
                Authorize Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


