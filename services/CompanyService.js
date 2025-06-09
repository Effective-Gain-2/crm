const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');
const { createUser } = require('./UserService');
const  pool  = require('../db/queries'); 

const createCompany = async (company, schema) => {
    const superAdminId = uuidv4();
    const superAdminData = company.superAdmin;

    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.users (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            password TEXT NOT NULL,
            permission TEXT,
            online BOOLEAN DEFAULT false,
            sector text
        );`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.chats (
              id UUID PRIMARY KEY,
              chat_id TEXT,
              connection_id TEXT,
              queue_id UUID,
              isGroup BOOLEAN,
              contact_name TEXT,
              assigned_user TEXT,
              status TEXT,
              created_at BIGINT,
              messages JSONB,
              contact_phone text,
              etapa_id uuid,
              updated_time bigint,
              unreadmessages boolean
            );
          `);
        await pool.query(`CREATE TABLE IF NOT EXISTS ${schema}.queues(
            id UUID PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            color TEXT,
            users JSONB,
            distribution boolean,
            superuser uuid REFERENCES ${schema}.users(id) ON DELETE SET NULL
        );`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${schema}.connections (
              id UUID PRIMARY KEY,
              name TEXT NOT NULL,
              number TEXT NOT NULL,
              queue_id uuid
            );
          `);
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.messages (
            id text PRIMARY KEY,
            body TEXT,
            from_me BOOLEAN,
            chat_id UUID,
            created_at BIGINT,
            message_type text,
            base64 text,
            isquoted boolean,
            quote_id text
        );
        `);
        await pool.query(`
             CREATE TABLE IF NOT EXISTS ${schema}.contacts (
             number text not null primary key,
             contact_name text
             )
            `)
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.last_assigned_user (
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (queue_id, user_id)
        );
        `);
    
        await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.queue_users (
            user_id UUID REFERENCES ${schema}.users(id) ON DELETE CASCADE,
            queue_id UUID REFERENCES ${schema}.queues(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, queue_id)
        );
        `);
        await pool.query(`
            CREATE TABLE ${schema}.custom_fields (
            id UUID PRIMARY KEY,
            field_name TEXT NOT NULL,
            label TEXT NOT NULL,
            UNIQUE(field_name)
            );
            `)
        await pool.query(`
            CREATE TABLE ${schema}.contact_custom_values (id UUID PRIMARY KEY,
            contact_number TEXT NOT NULL REFERENCES ${schema}.contacts(number) ON DELETE CASCADE,
            field_id UUID NOT NULL REFERENCES ${schema}.custom_fields(id) ON DELETE CASCADE,
            value TEXT,
            UNIQUE(contact_number, field_id)
            );
        `)
        await pool.query(`
            create table ${schema}.message_blast(
            id uuid primary key not null,
            value text not null,
            sector text not null,
            kanban_id uuid
            )
        `)
        await pool.query(`
            create table ${schema}.campaing(
            id UUID primary key,
            campaing_name text not null,
            sector text not null,
            kanban_stage UUID not null,
            connection_id UUID not null,
            start_date bigint,
            status text
            )
            `)

    const superAdmin = new Users(
        superAdminId,
        superAdminData.name,
        superAdminData.email,
        superAdminData.password,
        'admin'
    );

    await createUser(superAdmin, schema);

    await pool.query('INSERT INTO effective_gain.companies (company_name, schema_name) VALUES ($1, $2)', [
        company.name,
        schema
    ]);

    return { message: "Empresa criada com sucesso!" };
};

const getAllCompanies = async () => {
    const result = await pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public')
    `);
    return result.rows;
};
const getAllCompaniesTecUser = async () => {
    try{
        const result = await pool.query(
            `SELECT * FROM effective_gain.companies`
        )
        return result.rows
    }catch(error){
        console.log(error)
        throw new Error("Erro ao buscar empresas")
    }
}
module.exports = { createCompany, getAllCompanies, getAllCompaniesTecUser };