#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function checkAdmins() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/cannabis_registration'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query('SELECT email, username, is_active, role FROM admin_users');
    console.log('\nAdmin users in database:');
    console.log('========================');
    result.rows.forEach(admin => {
      console.log(`Email: ${admin.email}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Active: ${admin.is_active}`);
      console.log(`Role: ${admin.role}`);
      console.log('---');
    });
    console.log(`Total admin users: ${result.rows.length}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAdmins().catch(console.error);