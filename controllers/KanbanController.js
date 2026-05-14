const e = require("express");
const pool = require("../db/queries");
const { createKanbanStage, getFunis, getKanbanStages, getChatsInKanban, changeKanbanStage, updateStageName, updateStageIndex, createFunil, deleteEtapa, getCustomFields, getChatsInKanbanStage, deleteFunil, getContactsInKanbanStage, changeContactInKanban, getSpecificContactInKanban, insertContactInKanbanByStageId } = require("../services/KanbanService");
const { createMessageForBlast } = require("../services/MessageBlast");
const { changeKanbanPreference, getKanbanPreference } = require("../services/ContactService");

const createKanbanStageController = async (req, res) => {
    try {
        const { name, pos, sector, color } = req.body;
        const schema = req.schema;
        const result = await createKanbanStage(name, pos, color, sector, schema);
        
        res.status(201).json(result);
    } catch (err) {
        console.error("Erro ao criar estágio do Kanban:", err);
        res.status(500).json({ error: 'Erro ao criar estágio do Kanban' });
    }
}

const createMessageForBlastController = async (req, res) => {
    try {
        const { messageValue, sector, campaingId } = req.body;
        const schema = req.schema || 'effective_gain';
        const result = await createMessageForBlast(messageValue, sector, campaingId, schema);
        
        res.status(201).json(result);
    } catch (err) {
        console.error("Erro ao criar mensagem para blast:", err.message);
        res.status(500).json({ error: 'Erro ao criar mensagem para blast' });
    }
}
const getFunisController = async (req, res) => {
    try{
        const schema = req.schema
        const funis = await getFunis(schema)
        res.status(200).json(funis);
    }catch (err) {
        console.error("Erro ao buscar funis:", err.message);
        res.status(500).json({ error: 'Erro ao buscar funis' });
}
}
const getKanbanStagesController = async (req, res) => {
    try {
        const funil = req.params.funil;
        const schema = req.schema
        
        const stages = await getKanbanStages(funil, schema);
        res.status(200).json(stages);
    } catch (err) {
        console.error("Erro ao buscar estágios do Kanban:", err);
        res.status(500).json({ error: 'Erro ao buscar estágios do Kanban' });
    }
}

const getChatsInKanbanController = async (req, res) => {
    try {
        const {sector} = req.params
        const schema = req.schema
        const result = await getChatsInKanban(sector, schema)
        res.status(200).json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao buscar chats do kanban' })
    }
}

const changeKanbanStageController = async (req, res) => {
    try {
        const { chat_id, number, stage_id } = req.body;
        const schema = req.schema;
        let result;
        if (number) {
            const contact_exists = await getSpecificContactInKanban(number, schema);
            contact_exists? result = await changeContactInKanban(number, stage_id, schema) : result = await insertContactInKanbanByStageId(stage_id, number, schema);
            global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { number, stage_id });
        } else if (chat_id) {
            // Atualiza chat na etapa
            result = await changeKanbanStage(chat_id, stage_id, schema);
            global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { chat_id, stage_id });
        } else {
            return res.status(400).json({ error: 'Informe number (contato) ou chat_id (chat)' });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao mudar estágio do Kanban:', error);
        res.status(500).json({ error: 'Erro ao mudar estágio do Kanban' });
    }
};

const updateStageNameController = async (req, res) => {
    const {etapa_id, etapa_nome, sector, color, index} = req.body
    const schema = req.schema;
    let responded = false;
    try {
        const result = color
          ? await updateStageName(etapa_id, etapa_nome, color, sector, schema)
          : await updateStageName(etapa_id, etapa_nome, null, sector, schema);
        res.status(200).json(result);
        responded = true;
    } catch (error) {
        console.error(error)
        if (!responded) {
            res.status(500).json({ success: false, message: 'Erro ao atualizar etapa' })
            responded = true;
        }
    } finally {
        try { await updateStageIndex(etapa_id, index, sector, schema) } catch (e) { console.error(e) }
    }
}
const createFunilController = async (req, res) => {
    const {sector} = req.body
    const schema = req.schema;
    try {
        const result = await createFunil(sector, schema)
        res.status(200).json({
            success:true,
            result})

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao criar funil' })
    }
}
const deleteFunilController = async (req, res) => {
    const {sector} = req.params
    const {password, userRole} = req.body
    const schema = req.schema;

    
    try {
        if (userRole === 'admin' && !password) {
            return res.status(400).json({
                success: false,
                message: 'Senha é obrigatória para administradores'
            });
        }

        if (userRole === 'admin') {
            const { searchUser, getUserById } = require('../services/UserService');
            const userData = JSON.parse(req.headers['user-data'] || '{}');
            if (!userData.userData.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do usuário não encontrados'
                });
            }
            try {
                const email = await getUserById(userData.userData.id, schema)
                const user = await searchUser(email.email, password);
                if (!user || user.user.permission !== 'admin') {
                    return res.status(401).json({
                        success: false,
                        message: 'Senha incorreta ou usuário não é administrador'
                    });
                }
            } catch (error) {
                console.error(error)
                return res.status(401).json({
                    success: false,
                    message: 'Senha incorreta'
                });
            }
        }

        await deleteFunil(sector, schema)
        res.status(200).json({
            success: true,
            message: 'Funil deletado com sucesso'
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success: false,
            message: 'Erro ao deletar Funil'
        })
    }
}
const deleteEtapaController = async (req, res) => {
    const {etapa_id, sector} = req.body
    const schema = req.schema;
    try {
        const result = await deleteEtapa(etapa_id, sector, schema)
        res.status(200).json(result)

    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao deletar etapa' })
    }
}
const getCustomFieldsController = async (req, res) => {
    const schema = req.schema
    try {
        const result = await getCustomFields(schema)
        res.status(200).json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao buscar campos personalizados' })
    }
}
const transferAllChatsToStage = async (req, res) => {
    const {stage_id, new_stage} = req.body
    const schema = req.schema;
    try {
        const chats = await getChatsInKanbanStage(stage_id, schema)
        for(const chat of chats){
            await changeKanbanStage(chat.id, new_stage, schema)
            global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { chat_id: chat.id, stage_id: new_stage })

        }
        res.status(200).json({
            success:true
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Erro ao transferir chats em massa' })
    }
}
const getContactsInKanbanStageController = async (req, res) => {
    try {
        const { stage} = req.params;
        const schema = req.schema;
        const result = await getContactsInKanbanStage(stage, schema);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar contatos da etapa do Kanban' });
    }
};
const transferAllContactsToStage = async (req, res) => {
    const { numbers, new_stage} = req.body;
    const schema = req.schema;
    try {
        for (const number of numbers) {
            await changeContactInKanban(number, new_stage, schema);
            global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { number, stage_id: new_stage });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao transferir contatos em massa' });
    }
};
const changeKanbanPreferenceController = async (req, res) => {
    const {sector, label, color} = req.body
    const schema = req.schema;
    try {
        const result = await changeKanbanPreference(sector, label, color, schema)
        res.status(200).json({
            success:true,
            result
        })
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success:false,
        })
    }
}
const getKanbanPreferenceController = async (req, res) => {
    const { sector} = req.params;
    
    const schema = req.schema;
    try {
        const result = await getKanbanPreference(sector, schema);
        res.status(200).json(result || {});
    } catch (error) {
        console.error(error);
        res.status(400).json({});
    }
};
const transferChatToKanbanStageController = async (req, res) => {
    try {
        const { chat_id, funil, etapa_id } = req.body;
        const schema = req.schema;
        
        if (!chat_id || !funil || !etapa_id) {
            return res.status(400).json({ error: 'chat_id, funil e etapa_id são obrigatórios' });
        }

        // Buscar o número do contato do chat
        const chatResult = await pool.query(
            `SELECT contact_phone FROM ${schema}.chats WHERE id = $1`,
            [chat_id]
        );

        if (chatResult.rowCount === 0) {
            return res.status(404).json({ error: 'Chat não encontrado' });
        }

        const contactNumber = chatResult.rows[0].contact_phone;

        // Mover o contato para a etapa do kanban
        const result = await changeContactInKanban(contactNumber, etapa_id, schema);
        
        // Emitir evento para atualizar a interface
        global.socketIoServer.to(`schema_${schema}`).emit('leadMoved', { 
            number: contactNumber, 
            stage_id: etapa_id,
            funil: funil
        });

        res.status(200).json({
            success: true,
            message: 'Contato movido para o funil com sucesso',
            result
        });
    } catch (error) {
        console.error('Erro ao transferir chat para etapa do kanban:', error.message);
        res.status(500).json({ error: 'Erro ao transferir chat para etapa do kanban' });
    }
};

module.exports = {
    createKanbanStageController,
    createMessageForBlastController,
    getFunisController,
    getKanbanStagesController,
    getChatsInKanbanController,
    changeKanbanStageController,
    updateStageNameController,
    createFunilController,
    deleteFunilController,
    deleteEtapaController,
    getCustomFieldsController,
    transferAllChatsToStage,
    getContactsInKanbanStageController,
    transferAllContactsToStage,
    changeKanbanPreferenceController,
    getKanbanPreferenceController,
    transferChatToKanbanStageController
}