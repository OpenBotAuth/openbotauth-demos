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
      <div className="fixed left-0 right-0 bottom-0 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full bg-gray-100 border-t-2 border-gray-300 px-6 py-3 flex items-center gap-3 hover:bg-gray-200 transition-colors shadow-lg"
        >
          <AgentAvatar agent={activeAgent} speaking={speaking} />
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900">{agentName}</div>
            <div className="text-xs text-gray-600">Your Personal Shopping Agent • Click to expand</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 bg-gray-100 border-t-2 border-gray-300 shadow-2xl" style={{ maxHeight: '50vh' }}>
      <div className="max-w-full overflow-y-auto flex flex-col" style={{ maxHeight: '50vh' }}>
        {/* Agent Avatar and Info with Close Button - Browser-native style */}
        <div className="flex items-center gap-4 px-6 py-4 bg-gray-200 border-b border-gray-300">
          <AgentAvatar agent={activeAgent} speaking={speaking} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{agentName}</h3>
            <p className="text-sm text-gray-600">{agentRole}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              voiceStatus === 'speaking' ? 'bg-green-100 text-green-800' : 
              voiceStatus === 'listening' || voiceStatus === 'connected' ? 'bg-blue-100 text-blue-800' :
              voiceStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {voiceStatus === 'connecting' ? 'Connecting...' :
               voiceStatus === 'speaking' ? 'Speaking' :
               voiceStatus === 'listening' ? 'Listening' :
               voiceStatus === 'connected' ? 'Connected' : 'Idle'}
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
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
          <div className="mx-6 my-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Voice Controls */}
        {!conversationStarted && (
          <div className="text-center py-4 px-6 border-b border-gray-200 bg-gray-50">
            <button 
              onClick={handleStart}
              disabled={voiceStatus === 'connecting'}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-6 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
            >
              {/* <span>{voiceStatus === 'connecting' ? '🔄' : '🎤'}</span> */}
              <span>{voiceStatus === 'connecting' ? 'Connecting...' : `Use Voice with ${agentName}`}</span>
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Runs in your wallet / extension – embedded here for demo.
            </p>
          </div>
        )}

        {conversationStarted && (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-gray-50 px-6 py-4">
            <div className="text-sm text-gray-700 mb-3 flex-shrink-0 bg-blue-50 border border-blue-200 rounded p-3">
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
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full py-2 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <span>⏹️</span>
                  <span>Stop Voice</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Control Panel - ALWAYS VISIBLE - Browser-native style */}
        <div className="mt-auto pt-4 px-6 pb-4 border-t border-gray-300 bg-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-600 mb-3">
            {conversationStarted ? 'Or use manual controls:' : 'Manual Controls:'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {activeAgent === 'pete' ? (
              <>
                <button
                  onClick={handleManualAddItem}
                  className="bg-gray-50 border border-gray-300 hover:bg-white text-gray-800 text-sm py-2 rounded transition-colors"
                >
                  Add Item
                </button>
                <button
                  onClick={handleManualCheckout}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded col-span-2 transition-colors"
                >
                  Checkout
                </button>
              </>
            ) : (
              <button
                onClick={handleManualAuthorize}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded col-span-2 transition-colors"
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


