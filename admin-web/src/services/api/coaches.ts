import http from '../http';

export const coachApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get('/coaches', { params }),

  detail: (id: string) =>
    http.get(`/coaches/${id}`),

  create: (data: any) =>
    http.post('/coaches', data),

  update: (id: string, data: any) =>
    http.patch(`/coaches/${id}`, data),

  updateStatus: (id: string, status: string) =>
    http.patch(`/coaches/${id}/status`, { status }),

  createLesson: (coachId: string, data: any) =>
    http.post(`/coaches/${coachId}/lessons`, data),

  listLessons: (coachId: string) =>
    http.get(`/coaches/${coachId}/lessons`),
};
