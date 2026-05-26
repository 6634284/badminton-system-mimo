import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failRate = new Rate('failed_requests');

export const options = {
  stages: [
    { duration: '20s', target: 500 },
    { duration: '60s', target: 2000 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || 'test-token';

const endpoints = [
  '/api/client/v1/activities',
  '/api/client/v1/venues',
  '/api/client/v1/coaches',
  '/api/client/v1/tournaments',
  '/api/client/v1/coupons',
  '/api/client/v1/mall/products',
];

export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Tenant-Id': '1',
    },
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  failRate.add(!success);
  sleep(0.5);
}
