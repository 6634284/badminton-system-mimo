import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useActivityList } from '../../hooks/useActivity';
import './index.scss';

export default function HomePage() {
  const { data: activities } = useActivityList({ pageSize: 5 });

  return (
    <View className='home-page'>
      <View className='welcome-section'>
        <Text className='welcome-text'>欢迎来到羽毛球俱乐部</Text>
        <Text className='welcome-sub'>发现精彩活动，立即报名参加</Text>
      </View>

      <View className='section'>
        <View className='quick-nav'>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/mall/list' })}>
            <Text className='nav-icon'>🛒</Text>
            <Text className='nav-label'>商城</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/tournaments/list' })}>
            <Text className='nav-icon'>🏆</Text>
            <Text className='nav-label'>赛事</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/coaches/list' })}>
            <Text className='nav-icon'>🏸</Text>
            <Text className='nav-label'>教练</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/coupons/list' })}>
            <Text className='nav-icon'>🎫</Text>
            <Text className='nav-label'>优惠券</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/court-booking/index' })}>
            <Text className='nav-icon'>📅</Text>
            <Text className='nav-label'>预约</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/rankings/index' })}>
            <Text className='nav-icon'>📊</Text>
            <Text className='nav-label'>排名</Text>
          </View>
          <View className='nav-item' onClick={() => Taro.navigateTo({ url: '/pages/notifications/list' })}>
            <Text className='nav-icon'>🔔</Text>
            <Text className='nav-label'>消息</Text>
          </View>
        </View>
      </View>

      <View className='section'>
        <View className='section-header'>
          <Text className='section-title'>近期活动</Text>
          <Text className='section-more' onClick={() => Taro.switchTab({ url: '/pages/activities/list' })}>查看全部</Text>
        </View>
        {activities?.length ? (
          activities.slice(0, 3).map((item: any) => (
            <View
              key={item.id}
              className='mini-activity-card'
              onClick={() => Taro.navigateTo({ url: `/pages/activities/detail?id=${item.id}` })}
            >
              <Text className='mini-card-title'>{item.title}</Text>
              <View className='mini-card-info'>
                <Text className='mini-card-date'>{item.play_date}</Text>
                <Text className='mini-card-price'>¥{item.price}</Text>
              </View>
            </View>
          ))
        ) : (
          <View className='empty-state'>
            <Text>暂无活动</Text>
          </View>
        )}
      </View>
    </View>
  );
}
