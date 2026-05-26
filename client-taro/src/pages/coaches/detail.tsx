import { View, Text, Image } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { useQuery, useMutation } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { coachApi } from '../../services/api';
import './detail.scss';

export default function CoachDetail() {
  const router = useRouter();
  const id = router.params.id;

  const { data: coach } = useQuery({
    queryKey: ['coach', id],
    queryFn: async () => { const { data } = await coachApi.getOne(id); return data.data; },
    enabled: !!id,
  });

  const { data: lessons } = useQuery({
    queryKey: ['coach-lessons', id],
    queryFn: async () => { const { data } = await coachApi.getLessons(id); return data.data; },
    enabled: !!id,
  });

  const bookMut = useMutation({
    mutationFn: (data: { lessonId: number; scheduleTime: string }) => coachApi.bookLesson(data),
    onSuccess: () => Taro.showToast({ title: '预约成功', icon: 'success' }),
    onError: () => Taro.showToast({ title: '预约失败', icon: 'none' }),
  });

  if (!coach) return <View className='loading'><Text>加载中...</Text></View>;

  return (
    <View className='coach-detail'>
      <View className='hero'>
        <View className='avatar-wrap'>
          {coach.avatar_url ? <Image className='avatar' src={coach.avatar_url} /> : <View className='avatar-ph'>{coach.name?.[0]}</View>}
        </View>
        <View className='hero-info'>
          <Text className='name'>{coach.name}</Text>
          <Text className='level'>{coach.level || '教练'}</Text>
          <Text className='price'>¥{coach.price_per_hour}/小时</Text>
        </View>
      </View>

      {coach.bio && (
        <View className='card'>
          <Text className='card-title'>教练简介</Text>
          <Text className='card-body'>{coach.bio}</Text>
        </View>
      )}

      <View className='card'>
        <Text className='card-title'>课程列表</Text>
        {(lessons || []).map((l: any) => (
          <View key={l.id} className='lesson-item'>
            <View className='lesson-info'>
              <Text className='lesson-name'>{l.name}</Text>
              <Text className='lesson-meta'>{l.duration}分钟 | ¥{l.price}</Text>
            </View>
            <View className='book-btn' onClick={() => {
              Taro.showModal({
                title: '预约课程',
                content: `${l.name} - ¥${l.price}`,
                success: (res) => {
                  if (res.confirm) bookMut.mutate({ lessonId: Number(l.id), scheduleTime: new Date().toISOString() });
                },
              });
            }}>
              <Text>预约</Text>
            </View>
          </View>
        ))}
        {(!lessons || lessons.length === 0) && <Text className='empty'>暂无课程</Text>}
      </View>
    </View>
  );
}
