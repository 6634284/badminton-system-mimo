import Taro from '@tarojs/taro';
import { PlatformAdapter } from './adapter';

export const weappAdapter: PlatformAdapter = {
  async getStorage(key: string) {
    try {
      const res = await Taro.getStorage({ key });
      return res.data;
    } catch {
      return null;
    }
  },

  async setStorage(key: string, value: string) {
    await Taro.setStorage({ key, data: value });
  },

  async removeStorage(key: string) {
    await Taro.removeStorage({ key });
  },

  async login() {
    const res = await Taro.login();
    return { code: res.code };
  },

  async getUserProfile() {
    // Note: wx.getUserProfile was deprecated, use button open-type="chooseAvatar" instead
    return { nickName: '微信用户', avatarUrl: '' };
  },

  navigateTo(url: string) {
    Taro.navigateTo({ url: `/${url}` });
  },

  redirectTo(url: string) {
    Taro.redirectTo({ url: `/${url}` });
  },

  navigateBack() {
    Taro.navigateBack();
  },

  switchTab(url: string) {
    Taro.switchTab({ url: `/${url}` });
  },

  async requestPayment(params: any) {
    await Taro.requestPayment(params);
  },

  showShareMenu() {
    Taro.showShareMenu({ withShareTicket: true });
  },

  showToast(title: string, icon: 'success' | 'error' | 'loading' = 'success') {
    Taro.showToast({ title, icon, duration: 2000 });
  },

  showLoading(title: string) {
    Taro.showLoading({ title });
  },

  hideLoading() {
    Taro.hideLoading();
  },
};
