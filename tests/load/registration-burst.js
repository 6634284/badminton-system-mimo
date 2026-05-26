import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const failRate = new Rate('failed_requests');
const oversellCounter = new Counter('oversells');

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.01'],
    http_req_duration: ['p(99)<400'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || 'test-token';
const ACTIVITY_ID = __ENV.ACTIVITY_ID || '1';

export default function () {
  const idempotencyKey = `idem-${__VU}-${__ITER}-${Date.now()}`;

  const res = http.post(
    `${BASE_URL}/api/client/v1/registrations`,
    JSON.stringify({
      activityId: Number(ACTIVITY_ID),
      extraCount: 0,
      idempotencyKey,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
        'X-Tenant-Id': '1',
        'Idempotency-Key': idempotencyKey,
      },
    }
  );

  const success = check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'no overselling': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        if (body.data?.seat_no && body.data.seat_no < 0) {
          oversellCounter.add(1);
          return false;
        }
      }
      return true;
    },
  });

  failRate.add(!success);
  sleep(0.1);
}
