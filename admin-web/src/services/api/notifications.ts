import http from '../http';

export const notificationApi = {
  adminList: (params?: any) => http.get('/notifications', { params }),
  adminSend: (data: any) => http.post('/notifications/send', data),
  adminBulkSend: (data: any) => http.post('/notifications/bulk-send', data),
};
