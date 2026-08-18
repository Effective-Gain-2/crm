// Reconciliação de identidade de lead vindo de fora (HubSpot, Meta, import).
//
// O CRM identifica contato por telefone (contacts.number é a PK e o alvo da FK de
// opportunities). CRMs externos identificam por e-mail. Este módulo é a ponte:
// recebe o que veio e devolve com que chave a oportunidade deve ser gravada.
//
// Regra de precedência:
//   1. Tem telefone           -> é a chave. Grava/atualiza o contato e anexa o e-mail.
//   2. Só e-mail, já conhecido-> reaproveita o telefone do contato que tem esse e-mail.
//   3. Só e-mail, desconhecido-> oportunidade sem contato, e-mail guardado nela.
//      Quando o telefone aparecer (WhatsApp, atualização no HubSpot), o passo 1 casa.
const pool = require('../db/queries');

const onlyDigits = (v) => (v ? String(v).replace(/\D/g, '') : '');

// Normaliza e-mail para comparação (o índice único é em lower(email)).
const normalizeEmail = (v) => {
    const email = String(v ?? '').trim().toLowerCase();
    // Validação deliberadamente frouxa: barrar lixo óbvio sem rejeitar lead real
    // por causa de TLD exótico. O HubSpot já valida formato na entrada dele.
    return email.includes('@') && email.length <= 320 ? email : null;
};

// Grava/atualiza o contato pela PK (telefone), anexando e-mail e nome quando vierem.
// COALESCE em vez de sobrescrever: dado que já existe no CRM não é apagado por um
// payload externo incompleto.
const upsertContact = async (schema, { phone, email, name }) => {
    await pool.query(
        `INSERT INTO ${schema}.contacts (number, contact_name, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (number) DO UPDATE SET
             contact_name = COALESCE(NULLIF(EXCLUDED.contact_name, ''), ${schema}.contacts.contact_name),
             email        = COALESCE(NULLIF(EXCLUDED.email, ''), ${schema}.contacts.email)`,
        [phone, name || null, email || null]
    );
};

// Procura contato já existente com este e-mail (case-insensitive).
const findContactByEmail = async (schema, email) => {
    const res = await pool.query(
        `SELECT number FROM ${schema}.contacts WHERE lower(email) = $1 LIMIT 1`,
        [email]
    );
    return res.rows[0]?.number || null;
};

// Ponto de entrada. Devolve { contact_number, contact_email } pronto para a oportunidade.
// contact_number NULL é resultado válido (lead só com e-mail) — não é erro.
const resolveLeadIdentity = async (schema, { phone, email, name } = {}) => {
    const number = onlyDigits(phone);
    const mail = normalizeEmail(email);

    if (number) {
        await upsertContact(schema, { phone: number, email: mail, name });
        return { contact_number: number, contact_email: mail };
    }

    if (mail) {
        const existing = await findContactByEmail(schema, mail);
        if (existing) {
            // Contato conhecido por e-mail: reaproveita o telefone dele e atualiza o nome.
            await upsertContact(schema, { phone: existing, email: mail, name });
            return { contact_number: existing, contact_email: mail };
        }
        return { contact_number: null, contact_email: mail };
    }

    return { contact_number: null, contact_email: null };
};

// Reconciliação tardia: quando um telefone finalmente aparece para um e-mail que já
// gerou oportunidades órfãs, costura as duas pontas. Chamar depois de criar o contato.
const backfillOrphanOpportunities = async (schema, { phone, email }) => {
    const number = onlyDigits(phone);
    const mail = normalizeEmail(email);
    if (!number || !mail) return 0;
    const res = await pool.query(
        `UPDATE ${schema}.opportunities
            SET contact_number = $1
          WHERE contact_number IS NULL AND lower(contact_email) = $2`,
        [number, mail]
    );
    return res.rowCount || 0;
};

module.exports = { resolveLeadIdentity, upsertContact, findContactByEmail, backfillOrphanOpportunities, onlyDigits, normalizeEmail };
