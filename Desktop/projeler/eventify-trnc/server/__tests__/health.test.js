const request = require('supertest');
const app = require('../server');

describe('Health Check Endpoint', () => {
  test('GET /api/health should return OK status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'Eventify TRNC API is running');
    expect(response.body).toHaveProperty('timestamp');
  });
});



