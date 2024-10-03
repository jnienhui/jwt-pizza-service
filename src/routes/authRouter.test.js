const request = require('supertest');
const app = require('../service');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }

const testUserData = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUser;
let testUserAuthToken;
let userId;

beforeAll(async () => {
    testUserData.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUserData);
    testUserAuthToken = registerRes.body.token;
    userId = registerRes.body.user.id;
    testUser = registerRes.body.user;
});

test('register invalid user', async () => {
    registerUserData = {name: 'invalid', email: 'invalid@test.com'};
    const registerRes = await request(app).post('/api/auth').send(registerUserData);
    expect(registerRes.status).toBe(400);
    expect(registerRes.body.message).toMatch('name, email, and password are required');
});

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUserData);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
    expect(loginRes.body.user).toMatchObject(testUser);
});

test('update user', async () => {
    const updatedUserDetails = { email: 'updated_email@test.com', password: 'newpassword' };
  
    const updateRes = await request(app)
      .put(`/api/auth/${userId}`)
      .send(updatedUserDetails)
      .set('Authorization', `Bearer ${testUserAuthToken}`);
  
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.email).toBe(updatedUserDetails.email);
});

test('update user using another userID that is not an admin', async () => {
    const updatedUserDetails = { email: 'updated_email@test.com', password: 'newpassword' };
  
    const updateRes = await request(app)
      .put(`/api/auth/-1`)
      .send(updatedUserDetails)
      .set('Authorization', `Bearer ${testUserAuthToken}`);
  
    expect(updateRes.status).toBe(403);
    expect(updateRes.body.message).toBe('unauthorized');
});

test('logout user', async () => {
    // Send the logout request
    const logoutRes = await request(app)
      .delete('/api/auth')  // Logout route
      .set('Authorization', `Bearer ${testUserAuthToken}`);  // Attach the auth token
  
    // Check if the response is successful
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('logout successful');
  });
  
test('logout without auth token should fail', async () => {
    const logoutRes = await request(app)
        .delete('/api/auth')
        .set('Authorization', `Bearer dadmsadma`);

    expect(logoutRes.status).toBe(401);
    expect(logoutRes.body.message).toBe('unauthorized');
});

test('logout with nonexistent auth token should fail', async () => {
    const logoutRes = await request(app)
        .delete('/api/auth'); 

    expect(logoutRes.status).toBe(401);
    expect(logoutRes.body.message).toBe('unauthorized');
});