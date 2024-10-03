const request = require('supertest');
const app = require('../service');
const { DB, Role } = require('../database/database.js');

let testUser;
let testUserAuthToken;
let adminAuthToken;
let adminUser;

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

const testMenuItem = { title: 'New Pizza', description: 'Test pizza', image: 'pizza.png', price: 10 };
const testOrder = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] };

beforeAll(async () => {
    testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
    testUser.email = randomName() + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    adminUser = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: adminUser.email, password: adminUser.password });
    adminAuthToken = loginRes.body.token;
});

// Test getting the pizza menu (no auth required)
test('get pizza menu without authentication', async () => {
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
});

// Test adding a menu item (admin only)
test('add menu item as admin', async () => {
    const res = await request(app)
        .put('/api/order/menu')
        .send(testMenuItem)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([expect.objectContaining(testMenuItem)]));
});

// Test adding a menu item as non-admin (should fail)
test('add menu item as non-admin', async () => {
    const res = await request(app)
        .put('/api/order/menu')
        .send(testMenuItem)
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(403); // Forbidden
    expect(res.body.message).toBe('unable to add menu item');
});

// Test getting orders as a regular user
test('get orders as authenticated user', async () => {
    const res = await request(app)
        .get('/api/order')
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
});

// Test getting orders without authentication (should fail)
test('get orders without authentication', async () => {
    const res = await request(app).get('/api/order');
    expect(res.status).toBe(401); // Unauthorized
    expect(res.body.message).toBe('unauthorized');
});

// Test creating an order
// test('create a new order as authenticated user', async () => {
//     const res = await request(app)
//         .post('/api/order')
//         .send(testOrder)
//         .set('Authorization', `Bearer ${adminAuthToken}`);
//     expect(res.status).toBe(200);
//     expect(res.body).toHaveProperty('order');
//     expect(res.body.order.items).toEqual(expect.arrayContaining([expect.objectContaining(testOrder.items[0])]));
// });

// Test creating an order without authentication (should fail)
test('create order without authentication', async () => {
    const res = await request(app)
        .post('/api/order')
        .send(testOrder);
    expect(res.status).toBe(401); // Unauthorized
    expect(res.body.message).toBe('unauthorized');
});
