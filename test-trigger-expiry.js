import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rms-default-secret-key';
const API_URL = 'http://localhost:3001/api';

async function run() {
  try {
    console.log('Creating Sales token...');
    const token = jwt.sign(
      {
        id: 2,
        username: 'sakthivel.k@marslab.work',
        role: 'sales',
        fullName: 'Sakthivel K',
        email: 'sakthivel.k@marslab.work',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Create Active renewal
    console.log('\nCreating active renewal...');
    const resCreate = await axios.post(`${API_URL}/renewals`, {
      client_name: 'Cliq Test Client',
      service: 'Google Workspace',
      renewal_date: '2026-07-30', // Future date -> Active/Pending
      value: 12000,
      owner: 'Sakthivel K',
      client_email: 'test@cliq.com',
      sales_email: 'sakthivel.k@marslab.work',
      contact_number: '9876543210',
      reference_id: 'REF-CLIQ-123',
      invoice_number: 'INV-TEST-001',
      plan_period: 'yearly_plan'
    }, { headers });

    const newId = resCreate.data.id;
    console.log('Created renewal ID:', newId);

    // 2. Edit renewal to make it Expired
    console.log('\nUpdating renewal date to the past (making it Expired)...');
    const resUpdate = await axios.put(`${API_URL}/renewals/${newId}`, {
      client_name: 'Cliq Test Client',
      service: 'Google Workspace',
      renewal_date: '2026-05-01', // Past date -> Expired
      value: 12000,
      owner: 'Sakthivel K',
      client_email: 'test@cliq.com',
      sales_email: 'sakthivel.k@marslab.work',
      contact_number: '9876543210',
      reference_id: 'REF-CLIQ-123',
      invoice_number: 'INV-TEST-001',
      plan_period: 'yearly_plan',
      reason: 'Transition to expired'
    }, { headers });

    console.log('Update response status:', resUpdate.status);
    console.log('Update response data:', resUpdate.data);

    console.log('\nChecking docker container logs for Cliq output...');
  } catch (err) {
    console.error('Error running test:', err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

run();
