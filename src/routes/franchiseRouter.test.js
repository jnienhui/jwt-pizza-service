const request = require('supertest');
const app = require('../service'); 
const { DB, Role } = require('../database/database');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

let franchiseId;
let storeId;

let adminUser;
let adminAuthToken;

let testUser;
let testUserAuthToken;
let userId;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

beforeAll(async () => {
  adminUser = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
  adminAuthToken = loginRes.body.token;

  testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  userId = registerRes.body.user.id
});

test('list all franchises', async () => {
  const res = await request(app).get('/api/franchise');
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

test('list a user\'s franchises', async () => {
  const res = await request(app)
    .get(`/api/franchise/${userId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toBeInstanceOf(Array);
});

test('create a new franchise as admin', async () => {
  const franchiseData = { name: 'PizzaPocket', admins: [{ email: `${adminUser.email}` }] };
  const res = await request(app)
    .post('/api/franchise')
    .send(franchiseData)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('PizzaPocket');
  expect(res.body.admins[0].email).toBe(`${adminUser.email}`);
  franchiseId = res.body.id; // Store the franchise ID for future tests
});

test('create a new franchise as non-admin should fail', async () => {
  const franchiseData = { name: 'UnauthorizedFranchise', admins: [{ email: `${testUser.email}` }] };
  const res = await request(app)
    .post('/api/franchise')
    .send(franchiseData)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to create a franchise');
});

test('create a new store in a franchise as admin', async () => {
  const storeData = { name: 'SLC' };
  const res = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .send(storeData)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('SLC');
  storeId = res.body.id; // Store the store ID for deletion test
});

test('create a new store in a franchise as non-admin should fail', async () => {
  const storeData = { name: 'UnauthorizedStore' };
  const res = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .send(storeData)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to create a store');
});

test('delete a store as non-admin should fail', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to delete a store');
});

test('delete a store as admin', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('store deleted');
});

test('delete a franchise as non-admin should fail', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`);
  
  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to delete a franchise');
});

test('delete a franchise as admin', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`);

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('franchise deleted');
});
