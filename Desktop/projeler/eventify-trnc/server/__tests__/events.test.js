const request = require('supertest');
const app = require('../server');

describe('Events Endpoints', () => {
  test('GET /api/events should return events list', async () => {
    const response = await request(app)
      .get('/api/events')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('GET /api/events/:id should return 404 for invalid id', async () => {
    const response = await request(app)
      .get('/api/events/invalid-id')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});



