export interface FetchResponse {
  status: number;
  bytes: number;
  headers: Record<string, string>;
  bodySnippet: string;
  signed: boolean;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  trace?: {
    created: number;
    expires: number;
    keyId: string;
    signatureInput: string;
  };
  error?: string;
}

