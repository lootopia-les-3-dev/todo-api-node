/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '10s',
};

export default function () {
  const base = __ENV.FRONT_URL || 'http://localhost:3000';

  const health = http.get(`${base}/health`);
  check(health, { 'health status 200': (r) => r.status === 200 });

  const todos = http.get(`${base}/todos`);
  check(todos, { 'todos status 200': (r) => r.status === 200 });

  sleep(0.5);
}
