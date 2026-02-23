const fs = require('fs')
const path = require('path')


const migrationsDir = path.join(__dirname, '/migrations');
const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

async function runMigrations(client, schema) {
    await client.query(`SET search_path TO "${schema}", public`)
    for (const file of migrationFiles) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        try {
            await client.query(sql)
        } catch (error) {
            console.error(`Erro na migration ${file}`)
            console.error(error)
            throw error
        }
    }
}

module.exports = { runMigrations }