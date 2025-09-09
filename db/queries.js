const {Pool} = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
    user: process.env.postgres_username || 'postgres',
    host: process.env.postgres_host || 'localhost',
    database: process.env.postgres_db || 'postgres',
    password: process.env.postgres_password || 'postgres',
    port: Number(process.env.postgres_port) || 5432,
})

pool.on('connect',()=>{
})

pool.on('error',(err)=>{
    console.log('Erro na conexão PostgreSQL:', err)
})

module.exports = pool;