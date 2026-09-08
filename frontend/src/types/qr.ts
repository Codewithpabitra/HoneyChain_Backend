export interface BatchQRResponse {
  success: boolean;
  batchId: string;
  verificationUrl: string;
  dataUrl: string;
  svg: string;
}