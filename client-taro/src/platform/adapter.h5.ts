import { PlatformAdapter } from './adapter';

export const h5Adapter: PlatformAdapter = {
  async getStorage(key: string) {
    return localStorage.getItem(key);
  },

  async setStorage(key: string, value: string) {
    localStorage.setItem(key, value);
  },

  async removeStorage(key: string) {
    localStorage.removeItem(key);
  },

  async login() {
    // H5 login via phone/SMS, not wx.login
    throw new Error('H5 login not implemented yet');
  },

  async getUserProfile() {
    return { nickName: 'H5用户', avatarUrl: '' };
  },

  navigateTo(url: string) {
    window.location.href = `/${url}`;
  },

  redirectTo(url: string) {
    window.location.replace(`/${url}`);
  },

  navigateBack() {
    window.history.back();
  },

  switchTab(url: string) {
    window.location.href = `/${url}`;
  },

  async requestPayment(params: any) {
    // H5 payment: redirect to WeChat Pay H5 page
    console.log('H5 payment:', params);
    throw new Error('H5 payment not implemented yet');
  },

  showShareMenu() {
    // H5 share: use Web Share API if available
    console.log('Share not available in H5');
  },

  showToast(title: string) {
    alert(title); // Simple fallback
  },

  showLoading(title: string) {
    console.log('Loading:', title);
  },

  hideLoading() {
    console.log('Loading hidden');
  },
};
