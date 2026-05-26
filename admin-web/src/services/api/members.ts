import http from '../http';

export interface Member {
  id: string;
  member_no: string;
  level: number;
  points: number;
  total_spent_amount: string;
  blacklisted: boolean;
  joined_at: string;
  nickname?: string;
  phone?: string;
  avatar_url?: string;
}

export interface MemberQuery {
  keyword?: string;
  level?: number;
  blacklisted?: boolean;
  page?: number;
  pageSize?: number;
}

export const memberApi = {
  list: (query: MemberQuery) =>
    http.get('/members', { params: query }).then((r) => r.data.data),

  getOne: (id: string) =>
    http.get(`/members/${id}`).then((r) => r.data.data),

  update: (id: string, dto: { level?: number; tags?: string[]; note?: string; blacklisted?: boolean }) =>
    http.patch(`/members/${id}`, dto).then((r) => r.data.data),

  getCards: (id: string) =>
    http.get(`/members/${id}/cards`).then((r) => r.data.data),

  import: (rows: { phone: string; nickname?: string; level?: number }[]) =>
    http.post('/members/import', { rows }).then((r) => r.data.data),
};
