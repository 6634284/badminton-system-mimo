import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const failRate = new Rate('failed_requests');
const negativeCounter = new Counter('negative_balances');

export const options = {
  vus: 100,
  iterations: 100,
  thresholds: {
    failed_requests: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || 'test-token';

export default function () {
  const res = http.post(
    `${BASE_URL}/api/client/v1/wallet/debit`,
    JSON.stringify({
      amount: 1,
      bizType: 'test_debit',
      bizId: `test-${__VU}-${__ITER}`,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'X-Tenant-Id': '1',
        'Idempotency-Key': `debit-${__VU}-${__ITER}`,
      },
    }
  );

  const success = check(res, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'no negative balance': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        if (body.data?.balance && Number(body.data.balance) < 0) {
          negativeCounter.add(1);
          return false;
        }
      }
      return true;
    },
  });

  failRate.add(!success);
}
