const pool = require('./db/queries');
const { hash } = require('bcrypt');

async function hashPasswords(schemaName) {
    try {
        console.log(`Iniciando hash das senhas para o schema: ${schemaName}`);
        
        // Verificar se o schema existe
        const schemaExists = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = $1
        `, [schemaName]);
        
        if (schemaExists.rows.length === 0) {
            console.error(`Schema '${schemaName}' não encontrado!`);
            return;
        }
        
        // Buscar todos os usuários com senhas em plain text
        const users = await pool.query(`
            SELECT id, name, email, password, permission 
            FROM ${schemaName}.users 
            WHERE password NOT LIKE '$2b$%'
        `);
        
        if (users.rows.length === 0) {
            console.log(`Nenhuma senha em plain text encontrada no schema '${schemaName}'`);
            return;
        }
        
        console.log(`Encontradas ${users.rows.length} senhas para hashear`);
        
        // Hashear cada senha
        for (const user of users.rows) {
            try {
                const hashedPassword = await hash(user.password, 10);
                
                // Atualizar a senha no banco
                await pool.query(`
                    UPDATE ${schemaName}.users 
                    SET password = $1 
                    WHERE id = $2
                `, [hashedPassword, user.id]);
                
                console.log(`✓ Senha hasheada para: ${user.email}`);
                
            } catch (error) {
                console.error(`✗ Erro ao hashear senha do usuário ${user.email}:`, error.message);
            }
        }
        
        console.log(`\nProcesso concluído! ${users.rows.length} senhas foram hasheadas no schema '${schemaName}'`);
        
    } catch (error) {
        console.error('Erro durante o processo:', error.message);
    } finally {
        await pool.end();
    }
}

// Verificar se o nome do schema foi fornecido como argumento
const schemaName = process.argv[2];

if (!schemaName) {
    console.error('Uso: node hashPasswords.js <nome_do_schema>');
    console.error('Exemplo: node hashPasswords.js effective_gain');
    process.exit(1);
}

// Executar o script
hashPasswords(schemaName); 