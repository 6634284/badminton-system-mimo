import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useActivityList } from '../../hooks/useActivity';
import './list.scss';

const statusText: Record<string, string> = {
  published: '即将开始',
  registering: '报名中',
  full: '已满员',
  ongoing: '进行中',
};

export default function ActivityListPage() {
  const { data, isLoading } = useActivityList();

  const handleTap = (id: string) => {
    Taro.navigateTo({ url: `/pages/activities/detail?id=${id}` });
  };

  return (
    <View className='activity-list'>
      <View className='page-title'>近期活动</View>
      {isLoading ? (
        <View className='loading'>加载中...</View>
      ) : !data?.length ? (
        <View className='empty-state'>
          <Text>暂无活动</Text>
        </View>
      ) : (
        data.map((item: any) => (
          <View key={item.id} className='activity-card' onClick={() => handleTap(item.id)}>
            <View className='card-header'>
              <Text className='card-title'>{item.title}</Text>
              <Text className={`card-status status-${item.status}`}>
                {statusText[item.status] || item.status}
              </Text>
            </View>
            <View className='card-info'>
              <Text className='card-date'>{item.play_date}</Text>
              <Text className='card-time'>
                {item.start_at?.substring(11, 16)} - {item.end_at?.substring(11, 16)}
              </Text>
            </View>
            <View className='card-footer'>
              <Text className='card-price'>¥{item.price}</Text>
              <Text className='card-seats'>
                {item.join_count}/{item.capacity}人
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
