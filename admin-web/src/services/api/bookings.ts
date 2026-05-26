import http from '../http';

export const bookingApi = {
  adminList: (params?: any) => http.get('/court-bookings', { params }),
  adminCancel: (id: string, reason: string) => http.post(`/court-bookings/${id}/cancel`, { reason }),
};
