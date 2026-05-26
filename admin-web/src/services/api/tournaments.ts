import http from '../http';

export const tournamentApi = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http.get('/tournaments', { params }),

  detail: (id: string) =>
    http.get(`/tournaments/${id}`),

  create: (data: any) =>
    http.post('/tournaments', data),

  updateStatus: (id: string, status: string) =>
    http.patch(`/tournaments/${id}/status`, { status }),

  generateBracket: (id: string) =>
    http.post(`/tournaments/${id}/bracket`),

  getMatches: (id: string) =>
    http.get(`/tournaments/${id}/matches`),

  updateMatchResult: (matchId: string, data: { scoreText: string; winnerUserId: string }) =>
    http.patch(`/tournaments/matches/${matchId}/result`, data),

  awardPoints: (id: string) =>
    http.post(`/tournaments/${id}/award-points`),
};
