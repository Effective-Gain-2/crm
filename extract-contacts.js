const pool = require('./db/queries');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const listAvailableSchemas = async () => {
    try {
        const result = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')
            ORDER BY schema_name
        `);
        
        if (result.rows.length === 0) {
            console.log('Nenhum schema encontrado.');
            return [];
        }
        
        console.log('\nSchemas disponíveis:');
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.schema_name}`);
        });
        
        return result.rows;
    } catch (error) {
        console.error('Erro ao listar schemas:', error);
        return [];
    }
};

const extractContactsFromSchema = async (schemaName) => {
    try {
        
        const schemaExists = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name = $1
        `, [schemaName]);
        
        if (schemaExists.rows.length === 0) {
            throw new Error(`Schema '${schemaName}' não encontrado.`);
        }
        
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = $1 
                AND table_name = 'contacts'
            )
        `, [schemaName]);
        
        if (!tableExists.rows[0].exists) {
            throw new Error(`Tabela 'contacts' não encontrada no schema '${schemaName}'.`);
        }
        
        let query;
        let hasMessages = false;
        
        try {
            query = `
                SELECT DISTINCT 
                    c.number,
                    c.contact_name,
                    COUNT(m.id) as total_messages,
                    MAX(m.created_at) as last_message_date
                FROM ${schemaName}.contacts c
                INNER JOIN ${schemaName}.chats ch ON c.number = ch.contact_phone
                INNER JOIN ${schemaName}.messages m ON ch.id = m.chat_id
                GROUP BY c.number, c.contact_name
                ORDER BY last_message_date DESC
            `;
            
            const result = await pool.query(query);
            hasMessages = true;
            
            if (result.rows.length === 0) {
                console.log('Nenhum contato com mensagens encontrado neste schema.');
                return;
            }
            
            console.log(`Encontrados ${result.rows.length} contatos com mensagens.`);
            
            const excelData = result.rows.map(row => ({
                'Número': row.number,
                'Nome': row.contact_name || 'Sem nome',
                'Total de Mensagens': row.total_messages,
                'Última Mensagem': row.last_message_date ? new Date(parseInt(row.last_message_date)).toLocaleDateString('pt-BR') : 'N/A'
            }));
            
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            const colWidths = [
                { wch: 15 }, 
                { wch: 30 }, 
                { wch: 15 }, 
                { wch: 15 } 
            ];
            worksheet['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos com Mensagens');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName = `${schemaName}_contatos_com_mensagens_${timestamp}.xlsx`;
            const filePath = path.join(__dirname, fileName);
            
            XLSX.writeFile(workbook, filePath);
            
            console.log(`excel gerado com sucesso: ${fileName}`);
            console.log(`total de contatos extraídos: ${excelData.length}`);
            
            
            excelData.slice(0, 5).forEach((contact, index) => {
                console.log(`${index + 1}. ${contact.Nome} (${contact.Número}) - ${contact['Total de Mensagens']} mensagens`);
            });
            
        } catch (error) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log('Tabela de mensagens não encontrada. Extraindo todos os contatos...');
                await extractAllContactsFromSchema(schemaName);
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error(`Erro ao extrair contatos do schema '${schemaName}':`, error.message);
    }
};

const extractAllContactsFromSchema = async (schemaName) => {
    try {
        const query = `
            SELECT 
                c.number,
                c.contact_name
            FROM ${schemaName}.contacts c
            ORDER BY c.contact_name
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            console.log('Nenhum contato encontrado neste schema.');
            return;
        }
        
        console.log(`Encontrados ${result.rows.length} contatos.`);
        
        const excelData = result.rows.map(row => ({
            'Número': row.number,
            'Nome': row.contact_name || 'Sem nome'
        }));
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        const colWidths = [
            { wch: 15 }, // Número
            { wch: 30 }  // Nome
        ];
        worksheet['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Todos os Contatos');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `${schemaName}_todos_contatos_${timestamp}.xlsx`;
        const filePath = path.join(__dirname, fileName);
        
        XLSX.writeFile(workbook, filePath);
        
        console.log(`Arquivo Excel gerado com sucesso: ${fileName}`);
        console.log(`Caminho completo: ${filePath}`);
        console.log(`Total de contatos extraídos: ${excelData.length}`);
        
    } catch (error) {
        console.error(`Erro ao extrair todos os contatos do schema '${schemaName}':`, error.message);
    }
};

const main = async () => {
    try {
        console.log('=== SISTEMA DE EXTRAÇÃO DE CONTATOS ===\n');
        
        const schemas = await listAvailableSchemas();
        
        if (schemas.length === 0) {
            console.log('Nenhum schema disponível para extração.');
            return;
        }
        
        if (schemas.length === 1) {
            const schemaName = schemas[0].schema_name;
            console.log(`\nUsando único schema disponível: ${schemaName}`);
            await extractContactsFromSchema(schemaName);
        } else {
            console.log('\nExtraindo contatos de todos os schemas disponíveis...\n');
            
            for (const schema of schemas) {
                console.log(`\n${'='.repeat(50)}`);
                await extractContactsFromSchema(schema.schema_name);
                console.log(`${'='.repeat(50)}`);
            }
        }
        
        console.log('\nExtração concluída!');
        
    } catch (error) {
        console.error('Erro fatal:', error);
    } finally {
        process.exit(0);
    }
};

main();
