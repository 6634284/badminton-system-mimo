import http from '../http';

export interface Activity {
  id: string;
  tenant_id: string;
  venue_id: string;
  type: string;
  title: string;
  cover_url?: string;
  play_date: string;
  start_at: string;
  end_at: string;
  capacity: number;
  join_count: number;
  price: string;
  member_price?: string;
  status: string;
  created_at: string;
}

export interface ActivityQuery {
  status?: string;
  type?: string;
  date?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateActivityDto {
  venueId: number;
  type: string;
  title: string;
  playDate: string;
  startAt: string;
  endAt: string;
  capacity: number;
  price: number;
  memberPrice?: number;
  scheduleIds?: number[];
}

export const activityApi = {
  list: (query: ActivityQuery) =>
    http.get('/activities', { params: query }).then((r) => r.data.data),

  getOne: (id: string) =>
    http.get(`/activities/${id}`).then((r) => r.data.data),

  create: (dto: CreateActivityDto) =>
    http.post('/activities', dto).then((r) => r.data.data),

  update: (id: string, dto: Partial<CreateActivityDto>) =>
    http.patch(`/activities/${id}`, dto).then((r) => r.data.data),

  publish: (id: string) =>
    http.post(`/activities/${id}/publish`).then((r) => r.data.data),

  cancel: (id: string) =>
    http.post(`/activities/${id}/cancel`).then((r) => r.data.data),

  getRegistrations: (id: string, params?: any) =>
    http.get(`/activities/${id}/registrations`, { params }).then((r) => r.data.data),
};
