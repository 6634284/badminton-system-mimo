import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const failRate = new Rate('failed_requests');
const duplicateCounter = new Counter('duplicate_callbacks');

export const options = {
  vus: 100,
  iterations: 1000,
  thresholds: {
    failed_requests: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3003';

export default function () {
  const orderId = `PAY-TEST-${Math.floor(Math.random() * 10)}`;

  const res = http.post(
    `${BASE_URL}/api/open/v1/payments/wechat/notify`,
    JSON.stringify({
      id: `notify-${__VU}-${__ITER}`,
      event_type: 'TRANSACTION.SUCCESS',
      resource: {
        transaction_id: `wx-${orderId}-${__ITER}`,
        out_trade_no: orderId,
        amount: { total: 1000, currency: 'CNY' },
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'idempotent response': (r) => {
      const body = JSON.parse(r.body);
      return body.code === 0 || body.message === 'OK';
    },
  });

  failRate.add(!success);
}
