import http from '../http';

export const couponApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get('/coupons', { params }),

  create: (data: any) =>
    http.post('/coupons', data),

  update: (id: string, data: any) =>
    http.patch(`/coupons/${id}`, data),

  updateStatus: (id: string, status: string) =>
    http.patch(`/coupons/${id}/status`, { status }),
};
