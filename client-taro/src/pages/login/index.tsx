import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { http, setAccessToken } from '../../services/http';
import './index.scss';

export default function LoginPage() {
  const handleWechatLogin = async () => {
    try {
      const { code } = await Taro.login();

      const res = await http.post('/auth/wx-login', { code });

      if (res.code === 0) {
        setAccessToken(res.data.access_token);
        Taro.setStorageSync('access_token', res.data.access_token);
        Taro.setStorageSync('refresh_token', res.data.refresh_token);
        Taro.switchTab({ url: '/pages/home/index' });
      } else {
        Taro.showToast({ title: res.msg || '登录失败', icon: 'error' });
      }
    } catch (error) {
      Taro.showToast({ title: '登录失败', icon: 'error' });
    }
  };

  return (
    <View className='login-page'>
      <View className='login-header'>
        <Text className='login-title'>羽毛球俱乐部</Text>
        <Text className='login-subtitle'>登录后查看活动和报名</Text>
      </View>
      <View className='login-actions'>
        <Button className='login-btn wechat-btn' onClick={handleWechatLogin}>
          微信一键登录
        </Button>
      </View>
    </View>
  );
}
