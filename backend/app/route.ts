import { NextResponse } from 'next/server';

const endpoints = {
  auth: ['/api/auth/session'],
  products: ['/api/products', '/api/products/[slug]'],
  orders: ['/api/orders', '/api/orders/[id]', '/api/orders/[id]/cancel'],
  payments: ['/api/checkout', '/api/payments/verify/[reference]', '/api/payments/webhook'],
  admin: [
    '/api/admin/categories',
    '/api/admin/orders',
    '/api/admin/products',
    '/api/admin/upload',
    '/api/admin/zones',
  ],
  usersAndZones: ['/api/users/profile', '/api/zones/detect'],
};

export function GET() {
  return NextResponse.json({
    success: true,
    service: 'Cripsron Backend API',
    status: 'running',
    endpoints,
  });
}

