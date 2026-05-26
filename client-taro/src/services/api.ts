import { http } from './http';

export const activityApi = {
  list: (params?: any) => http.get('/activities', params),
  getOne: (id: string) => http.get(`/activities/${id}`),
  getSeats: (id: string) => http.get(`/activities/${id}/seats`),
  register: (data: { activityId: number; extraCount?: number; idempotencyKey?: string; shareToken?: string }) =>
    http.post('/registrations', data),
  cancel: (id: string, reason?: string) => http.post(`/registrations/${id}/cancel`, { reason }),
  myRegistrations: (params?: any) => http.get('/registrations/me', params),
};

export const walletApi = {
  getBalance: () => http.get('/wallet/balance'),
  getTransactions: (params?: any) => http.get('/wallet/transactions', params),
  getRechargePackages: () => http.get('/wallet/recharge-packages'),
  recharge: (data: { packageId?: number; amount?: number }) => http.post('/wallet/recharge', data),
  getRechargeOrders: (params?: any) => http.get('/wallet/recharge-orders', params),
};

export const memberApi = {
  getMe: () => http.get('/members/me'),
  getMyCards: () => http.get('/members/me/cards'),
};

export const venueApi = {
  list: () => http.get('/venues'),
  getOne: (id: string) => http.get(`/venues/${id}`),
  getSchedules: (id: string, date: string) => http.get(`/venues/${id}/schedules`, { date }),
};

export const mallApi = {
  list: (params?: any) => http.get('/mall/products', params),
  getOne: (id: string) => http.get(`/mall/products/${id}`),
  addToCart: (data: { skuId: number; quantity: number }) => http.post('/mall/cart', data),
  getCart: () => http.get('/mall/cart'),
  createOrder: (data: any) => http.post('/mall/orders', data),
  myOrders: (params?: any) => http.get('/mall/orders/me', params),
};

export const tournamentApi = {
  list: (params?: any) => http.get('/tournaments', params),
  getOne: (id: string) => http.get(`/tournaments/${id}`),
  register: (id: string, data: any) => http.post(`/tournaments/${id}/register`, data),
  getMatches: (id: string) => http.get(`/tournaments/${id}/matches`),
  myRegistrations: (params?: any) => http.get('/tournaments/my/registrations', params),
};

export const coachApi = {
  list: (params?: any) => http.get('/coaches', params),
  getOne: (id: string) => http.get(`/coaches/${id}`),
  getLessons: (id: string) => http.get(`/coaches/${id}/lessons`),
  bookLesson: (data: { lessonId: number; scheduleTime: string }) => http.post('/coaches/lessons/book', data),
  myLessons: (params?: any) => http.get('/coaches/my/lessons', params),
};

export const couponApi = {
  list: (params?: any) => http.get('/coupons', params),
  claim: (id: string) => http.post(`/coupons/${id}/claim`),
  myCoupons: (params?: any) => http.get('/coupons/me', params),
};

export const notificationApi = {
  list: (params?: any) => http.get('/notifications', params),
  markRead: (id: string) => http.post(`/notifications/${id}/read`),
  markAllRead: () => http.post('/notifications/read-all'),
};

export const courtBookingApi = {
  getSlots: (venueId: string, courtId: string, date: string) =>
    http.get(`/venues/${venueId}/courts/${courtId}/slots`, { date }),
  book: (data: { courtId: number; scheduleId: number; date: string }) =>
    http.post('/court-bookings', data),
  cancel: (id: string) => http.post(`/court-bookings/${id}/cancel`),
  myBookings: (params?: any) => http.get('/court-bookings/me', params),
};

export const rankingApi = {
  leaderboard: (params?: any) => http.get('/rankings/leaderboard', params),
  myPoints: () => http.get('/rankings/me'),
};
