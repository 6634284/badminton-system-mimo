import http from '../http';

export interface SystemConfig {
  key: string;
  value: string;
  description: string;
  category: string;
}

export const settingsApi = {
  list: () =>
    http.get<{ code: number; data: SystemConfig[] }>('/settings'),

  update: (key: string, value: string) =>
    http.patch(`/settings/${key}`, { value }),
};
