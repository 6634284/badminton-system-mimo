export interface PlatformAdapter {
  // Storage
  getStorage(key: string): Promise<string | null>;
  setStorage(key: string, value: string): Promise<void>;
  removeStorage(key: string): Promise<void>;

  // Auth
  login(): Promise<{ code: string }>;
  getUserProfile(): Promise<{ nickName: string; avatarUrl: string }>;

  // Navigation
  navigateTo(url: string): void;
  redirectTo(url: string): void;
  navigateBack(): void;
  switchTab(url: string): void;

  // Payment
  requestPayment(params: any): Promise<void>;

  // Sharing
  showShareMenu(): void;

  // Toast
  showToast(title: string, icon?: 'success' | 'error' | 'loading'): void;
  showLoading(title: string): void;
  hideLoading(): void;
}
