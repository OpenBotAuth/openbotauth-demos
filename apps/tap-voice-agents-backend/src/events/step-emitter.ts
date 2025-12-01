import { Response } from 'express';
import { SSEEvent, SSEEventType } from '../types.js';

// Store active SSE connections
const clients = new Set<Response>();

export class StepEmitter {
  static addClient(res: Response): void {
    clients.add(res);
    
    // Remove client on connection close
    res.on('close', () => {
      clients.delete(res);
    });
  }

  static emit(event: any): void {
    const message = `data: ${JSON.stringify(event)}\n\n`;

    clients.forEach((client) => {
      try {
        client.write(message);
      } catch (error) {
        console.error('Error writing to SSE client:', error);
        clients.delete(client);
      }
    });
  }

  static emitStep(
    type: SSEEventType,
    stepId: string,
    phase: SSEEvent['phase'],
    data?: any
  ): void {
    const event: SSEEvent = {
      type,
      stepId,
      phase,
      timestamp: Date.now(),
      data,
    };

    const message = `data: ${JSON.stringify(event)}\n\n`;

    clients.forEach((client) => {
      try {
        client.write(message);
      } catch (error) {
        console.error('Error writing to SSE client:', error);
        clients.delete(client);
      }
    });

    console.log(`[SSE] Emitted ${type} for step ${stepId} (phase: ${phase})`);
  }

  static emitStepStart(stepId: string, phase: SSEEvent['phase'], data?: any): void {
    this.emitStep('step_start', stepId, phase, data);
  }

  static emitStepComplete(stepId: string, phase: SSEEvent['phase'], data?: any): void {
    this.emitStep('step_complete', stepId, phase, data);
  }

  static emitStepError(stepId: string, phase: SSEEvent['phase'], error: string): void {
    this.emitStep('step_error', stepId, phase, { error });
  }

  static emitCheckoutComplete(orderId: string, transactionId: string): void {
    this.emitStep('step_complete', 'checkout_complete', 'payment', {
      orderId,
      transactionId,
    });
  }
}

