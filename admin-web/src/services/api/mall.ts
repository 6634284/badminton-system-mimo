import http from '../http';

export const mallApi = {
  listProducts: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http.get('/mall/products', { params }),

  createProduct: (data: any) =>
    http.post('/mall/products', data),

  updateProduct: (id: string, data: any) =>
    http.patch(`/mall/products/${id}`, data),

  updateProductStatus: (id: string, status: string) =>
    http.patch(`/mall/products/${id}/status`, { status }),

  listOrders: (params?: { page?: number; pageSize?: number }) =>
    http.get('/mall/orders', { params }),

  updateOrderStatus: (id: string, status: string) =>
    http.patch(`/mall/orders/${id}/status`, { status }),
};
