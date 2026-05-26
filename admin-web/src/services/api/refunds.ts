import http from '../http';

export interface Refund {
  id: string;
  refund_no: string;
  payment_id: string;
  biz_type: string;
  biz_order_no: string;
  refund_amount: string;
  status: string;
  refunded_at?: string;
  created_at: string;
}

export const refundApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get<{ code: number; data: { list: Refund[]; total: number; page: number; pageSize: number } }>('/refunds', { params }),

  create: (data: { paymentId: string; refundAmount: number; reason?: string }) =>
    http.post<{ code: number; data: Refund }>('/refunds', data),
};
