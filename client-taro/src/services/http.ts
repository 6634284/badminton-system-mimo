import Taro from '@tarojs/taro';

const BASE_URL = process.env.TARO_ENV === 'h5' ? '/api/client/v1' : 'http://localhost:3000/api/client/v1';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
}

let accessToken: string | null = null;
let tenantId: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setTenantId(id: string | null) {
  tenantId = id;
}

export async function request<T = any>(options: RequestOptions): Promise<{ code: number; msg: string; data: T }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }

  const res = await Taro.request({
    url: `${BASE_URL}${options.url}`,
    method: options.method,
    data: options.data,
    header: headers,
  });

  if (res.statusCode === 401) {
    // Token expired, redirect to login
    accessToken = null;
    Taro.redirectTo({ url: '/pages/login/index' });
    throw new Error('Unauthorized');
  }

  return res.data as { code: number; msg: string; data: T };
}

export const http = {
  get: <T = any>(url: string, params?: any) =>
    request<T>({ method: 'GET', url: params ? `${url}?${new URLSearchParams(params)}` : url }),
  post: <T = any>(url: string, data?: any) =>
    request<T>({ method: 'POST', url, data }),
  put: <T = any>(url: string, data?: any) =>
    request<T>({ method: 'PUT', url, data }),
  delete: <T = any>(url: string) =>
    request<T>({ method: 'DELETE', url }),
};
