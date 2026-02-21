import request from 'supertest';
import { app } from './app';

describe('App', () => {
  it('should return a 200 OK status', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  it('should return "Hello World!"', async () => {
    const response = await request(app).get('/');
    expect(response.text).toBe('Hello World!');
  });

  // Add more tests for other routes and functionalities in app.ts
});