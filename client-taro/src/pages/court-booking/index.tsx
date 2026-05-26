import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Taro from '@tarojs/taro';
import { venueApi, courtBookingApi } from '../../services/api';
import './index.scss';

export default function CourtBooking() {
  const qc = useQueryClient();
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: venues } = useQuery({
    queryKey: ['venues'],
    queryFn: async () => { const { data } = await venueApi.list(); return data.data; },
  });

  const { data: venueDetail } = useQuery({
    queryKey: ['venue', selectedVenue],
    queryFn: async () => { const { data } = await venueApi.getOne(selectedVenue); return data.data; },
    enabled: !!selectedVenue,
  });

  const { data: slots } = useQuery({
    queryKey: ['slots', selectedVenue, selectedCourt, selectedDate],
    queryFn: async () => {
      const { data } = await courtBookingApi.getSlots(selectedVenue, selectedCourt, selectedDate);
      return data.data;
    },
    enabled: !!selectedVenue && !!selectedCourt,
  });

  const bookMut = useMutation({
    mutationFn: (data: { courtId: number; scheduleId: number; date: string }) => courtBookingApi.book(data),
    onSuccess: () => {
      Taro.showToast({ title: '预约成功', icon: 'success' });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: () => Taro.showToast({ title: '预约失败', icon: 'none' }),
  });

  return (
    <View className='court-booking'>
      <Text className='page-title'>场地预约</Text>

      <View className='section'>
        <Text className='label'>选择场馆</Text>
        <View className='venue-list'>
          {(venues?.list || []).map((v: any) => (
            <View
              key={v.id}
              className={`venue-tag ${selectedVenue === v.id ? 'active' : ''}`}
              onClick={() => { setSelectedVenue(v.id); setSelectedCourt(''); }}
            >
              <Text>{v.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {selectedVenue && venueDetail?.courts && (
        <View className='section'>
          <Text className='label'>选择场地</Text>
          <View className='court-list'>
            {venueDetail.courts.map((c: any) => (
              <View
                key={c.id}
                className={`court-tag ${selectedCourt === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCourt(c.id)}
              >
                <Text>{c.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedCourt && (
        <View className='section'>
          <Text className='label'>选择时段 ({selectedDate})</Text>
          {(slots || []).map((s: any) => (
            <View
              key={s.id}
              className={`slot-item ${s.status !== 'available' ? 'disabled' : ''}`}
              onClick={() => {
                if (s.status !== 'available') return;
                Taro.showModal({
                  title: '确认预约',
                  content: `${s.start_time}-${s.end_time}`,
                  success: (res) => {
                    if (res.confirm) {
                      bookMut.mutate({ courtId: Number(selectedCourt), scheduleId: Number(s.id), date: selectedDate });
                    }
                  },
                });
              }}
            >
              <Text className='slot-time'>{s.start_time}-{s.end_time}</Text>
              <Text className='slot-status'>{s.status === 'available' ? '可预约' : '已预约'}</Text>
            </View>
          ))}
          {(!slots || slots.length === 0) && <View className='empty'><Text>暂无可用时段</Text></View>}
        </View>
      )}
    </View>
  );
}
