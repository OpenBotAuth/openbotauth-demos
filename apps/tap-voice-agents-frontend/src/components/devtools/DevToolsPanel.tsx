import { useState } from 'react';
import { DevToolsTab, AgenticConsumer, AgenticPaymentContainer } from '../../types';
import HTTPHeadersTab from './HTTPHeadersTab';
import ConsumerObjectTab from './ConsumerObjectTab';
import PaymentObjectTab from './PaymentObjectTab';
import RawRequestTab from './RawRequestTab';

interface DevToolsPanelProps {
  visible: boolean;
  httpHeaders: Record<string, string> | null;
  consumerObject: AgenticConsumer | null;
  paymentObject: AgenticPaymentContainer | null;
  requestData?: {
    method: string;
    url: string;
    body?: any;
  };
}

export default function DevToolsPanel({ 
  visible, 
  httpHeaders, 
  consumerObject, 
  paymentObject,
  requestData 
}: DevToolsPanelProps) {
  const [selectedTab, setSelectedTab] = useState<DevToolsTab>('http');

  const tabs: { id: DevToolsTab; label: string }[] = [
    { id: 'http', label: 'HTTP Headers' },
    { id: 'consumer', label: 'Consumer Object' },
    { id: 'payment', label: 'Payment Object' },
    { id: 'raw', label: 'Raw Request' },
  ];

  return (
    <div 
      className={`transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      } fixed bottom-0 left-0 right-0 h-[30vh] bg-slate-900 border-t border-slate-700 z-40`}
    >
      <div className="h-full flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-slate-800 text-slate-100 border-b-2 border-accent'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedTab === 'http' && <HTTPHeadersTab headers={httpHeaders} />}
          {selectedTab === 'consumer' && <ConsumerObjectTab consumer={consumerObject} />}
          {selectedTab === 'payment' && <PaymentObjectTab payment={paymentObject} />}
          {selectedTab === 'raw' && (
            <RawRequestTab 
              method={requestData?.method}
              url={requestData?.url}
              headers={httpHeaders}
              body={requestData?.body}
            />
          )}
        </div>
      </div>
    </div>
  );
}

