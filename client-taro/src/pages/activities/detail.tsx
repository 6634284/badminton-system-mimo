import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useActivityDetail, useActivitySeats, useRegisterActivity } from '../../hooks/useActivity';
import './detail.scss';

export default function ActivityDetailPage() {
  const router = useRouter();
  const activityId = router.params.id || '';

  const { data: activity, isLoading } = useActivityDetail(activityId);
  const { data: seats } = useActivitySeats(activityId);
  const registerMut = useRegisterActivity();

  const handleRegister = async () => {
    try {
      const res = await registerMut.mutateAsync({ activityId: parseInt(activityId) });
      if (res.code === 0) {
        Taro.showToast({ title: '报名成功！', icon: 'success' });
      } else {
        Taro.showToast({ title: res.msg || '报名失败', icon: 'error' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '报名失败', icon: 'error' });
    }
  };

  if (isLoading) {
    return <View className='loading'>加载中...</View>;
  }

  if (!activity) {
    return <View className='empty-state'>活动不存在</View>;
  }

  const isFull = seats?.is_full;
  const canRegister = ['published', 'registering'].includes(activity.status) && !isFull;

  return (
    <View className='activity-detail'>
      <View className='detail-header'>
        <Text className='detail-title'>{activity.title}</Text>
        <Text className={`detail-status status-${activity.status}`}>
          {activity.status === 'registering' ? '报名中' : activity.status === 'full' ? '已满' : activity.status}
        </Text>
      </View>

      <View className='detail-section'>
        <View className='info-row'>
          <Text className='info-label'>活动日期</Text>
          <Text className='info-value'>{activity.play_date}</Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>时间</Text>
          <Text className='info-value'>
            {activity.start_at?.substring(11, 16)} - {activity.end_at?.substring(11, 16)}
          </Text>
        </View>
        <View className='info-row'>
          <Text className='info-label'>价格</Text>
          <Text className='info-value price'>¥{activity.price}</Text>
        </View>
        {activity.member_price && (
          <View className='info-row'>
            <Text className='info-label'>会员价</Text>
            <Text className='info-value price'>¥{activity.member_price}</Text>
          </View>
        )}
      </View>

      <View className='detail-section'>
        <Text className='section-title'>座位情况</Text>
        <View className='seats-info'>
          <View className='seats-bar'>
            <View
              className='seats-fill'
              style={{ width: `${seats ? (seats.join_count / seats.capacity) * 100 : 0}%` }}
            />
          </View>
          <Text className='seats-text'>
            已报 {seats?.join_count || 0}/{seats?.capacity || 0}，剩余 {seats?.remaining || 0} 个名额
          </Text>
        </View>
      </View>

      <View className='detail-actions'>
        {canRegister ? (
          <Button className='register-btn' onClick={handleRegister} loading={registerMut.isPending}>
            立即报名
          </Button>
        ) : (
          <Button className='register-btn disabled' disabled>
            {isFull ? '名额已满' : '暂不可报名'}
          </Button>
        )}
      </View>
    </View>
  );
}
