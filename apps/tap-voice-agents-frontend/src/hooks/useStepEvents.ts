import { useEffect, useState } from 'react';
import { SequenceStep, ParticipantType } from '../types';

const BACKEND_URL = 'http://localhost:8090';

interface StepEventsCallbacks {
  onCartUpdated?: (data: { items: any[]; total: number; item_count: number }) => void;
  onCheckoutInitiated?: (data: { checkout_id: string; total: number }) => void;
  onPaymentAuthorized?: () => void;
}

export function useStepEvents(callbacks?: StepEventsCallbacks) {
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    console.log(`[SSE] Connecting to ${BACKEND_URL}/api/events/stream`);
    const eventSource = new EventSource(`${BACKEND_URL}/api/events/stream`);

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('[SSE] ✅ Connected - Ready for payment flow events');
          return;
        }

        // Handle custom events from ElevenLabs webhooks
        if (data.type === 'cart_updated') {
          console.log('[SSE] 🛒 Cart updated:', data.data);
          callbacks?.onCartUpdated?.(data.data);
          return;
        }

        if (data.type === 'checkout_initiated') {
          console.log('[SSE] 💳 Checkout initiated:', data.data);
          callbacks?.onCheckoutInitiated?.(data.data);
          return;
        }

        if (data.type === 'payment_authorized') {
          console.log('[SSE] ✅ Payment authorized - closing cart panel');
          callbacks?.onPaymentAuthorized?.();
          return;
        }

        console.log(`[SSE] 📡 Event: ${data.type} | Step: ${data.stepId} | Phase: ${data.phase}`);

        // Map SSE events to sequence steps
        const stepMap: Record<string, { from: ParticipantType; to: ParticipantType; label: string }> = {
          'build-tap-objects': { from: 'agent', to: 'agent', label: 'Build TAP Objects' },
          'send-signed-request': { from: 'agent', to: 'merchant', label: 'Send Signed Request' },
          'merchant-receive': { from: 'agent', to: 'merchant', label: 'POST /checkout' },
          'oba-verify-http-sig': { from: 'merchant', to: 'oba-verifier', label: 'Verify HTTP Signature' },
          'fetch-jwks': { from: 'oba-verifier', to: 'oba-registry', label: 'Fetch JWKS' },
          'verify-tap-signatures': { from: 'merchant', to: 'merchant', label: 'Verify TAP Signatures' },
          'visa-authorize': { from: 'merchant', to: 'visa', label: 'Authorize Payment' },
          'merchant-checkout': { from: 'merchant', to: 'agent', label: 'Checkout Complete' },
        };

        const stepConfig = stepMap[data.stepId];
        if (!stepConfig) {
          console.log(`[SSE] ⚠️ Unknown step ID: ${data.stepId} (skipping)`);
          return;
        }
        
        console.log(`[SSE] ➕ Adding step to diagram: ${data.stepId} (${stepConfig.from} → ${stepConfig.to})`);

        setSteps((prev) => {
          const existingIndex = prev.findIndex((s) => s.id === data.stepId);
          
          const newStep: SequenceStep = {
            id: data.stepId,
            from: stepConfig.from,
            to: stepConfig.to,
            label: stepConfig.label,
            status: data.type === 'step_start' ? 'active' : 
                    data.type === 'step_complete' ? 'completed' : 
                    data.type === 'step_error' ? 'error' : 'pending',
            timestamp: data.timestamp,
            data: data.data,
          };

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newStep;
            if (newStep.status === 'completed') {
              setActiveStep(existingIndex + 1);
            }
            return updated;
          } else {
            setActiveStep(prev.length);
            return [...prev, newStep];
          }
        });
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('[SSE] Connection error - ensure backend is running');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { steps, activeStep };
}

