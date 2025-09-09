require('dotenv').config();

console.log('=== TESTE DE VARIÁVEIS DE AMBIENTE ===');
console.log('postgres_username:', process.env.postgres_username);
console.log('postgres_password:', process.env.postgres_password);
console.log('postgres_host:', process.env.postgres_host);
console.log('postgres_db:', process.env.postgres_db);
console.log('postgres_port:', process.env.postgres_port);
console.log('==============================');

