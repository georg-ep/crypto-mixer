export interface SendTransactionResponse {
  signature: string;
  fromBal: number;
  toBal: number;
  data: string;
  url: string;
}
