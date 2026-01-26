const request = require('supertest');

// Set test environment
process.env.NODE_ENV = 'test';

const app = require('../server');

describe('Server Health Check', () => {
  test('GET /health should return 200 and health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
  });

  test('Health check response should have correct structure', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(typeof response.body.status).toBe('string');
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.environment).toBe('string');
  });
});
