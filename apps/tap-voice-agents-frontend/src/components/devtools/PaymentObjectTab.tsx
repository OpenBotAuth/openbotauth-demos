import { AgenticPaymentContainer } from '../../types';

interface PaymentObjectTabProps {
  payment: AgenticPaymentContainer | null;
}

export default function PaymentObjectTab({ payment }: PaymentObjectTabProps) {
  if (!payment) {
    return (
      <div className="text-center py-8 text-slate-400">
        No payment object available yet
      </div>
    );
  }

  return (
    <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
      {JSON.stringify(payment, null, 2)}
    </pre>
  );
}

