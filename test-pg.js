import pg from 'pg';
const { Client } = pg;

const client = new Client({
  user: 'marslab_user',
  host: 'localhost',
  database: 'marslab_db',
  password: 'marslab123',
  port: 5432,
});

client.connect()
  .then(() => {
    console.log('Connected to PostgreSQL successfully!');
    client.end();
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    client.end();
  });
