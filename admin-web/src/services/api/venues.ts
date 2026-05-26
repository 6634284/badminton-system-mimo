import http from '../http';

export interface Venue {
  id: string;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  status: string;
  created_at: string;
}

export interface Court {
  id: string;
  venue_id: string;
  code: string;
  type: string;
  base_price: string;
  status: string;
}

export const venueApi = {
  list: (params?: any) =>
    http.get('/venues', { params }).then((r) => r.data.data),

  getOne: (id: string) =>
    http.get(`/venues/${id}`).then((r) => r.data.data),

  create: (dto: any) =>
    http.post('/venues', dto).then((r) => r.data.data),

  update: (id: string, dto: any) =>
    http.patch(`/venues/${id}`, dto).then((r) => r.data.data),
};

export const courtApi = {
  list: (params?: any) =>
    http.get('/courts', { params }).then((r) => r.data.data),

  create: (dto: any) =>
    http.post('/courts', dto).then((r) => r.data.data),

  getSchedules: (params: { venueId: number; date: string }) =>
    http.get('/schedules', { params }).then((r) => r.data.data),

  generateSchedules: (dto: any) =>
    http.post('/schedules/generate', dto).then((r) => r.data.data),
};
