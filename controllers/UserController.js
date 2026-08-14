const pool = require('../db/queries');
const { getAllUsers, getOnlineUsers, changeOffline, getUserById } = require('../services/UserService');
const { createOrAttachUser, revokeAccess, updateAccountBasics, setAccountPassword, verifyPassword, getMembership, ensureMirrorUser, findAccountById, CLIENT_ROLES } = require('../services/AuthService');
const { auth } = require('../middlewares/auth');

// Compat: vários arquivos de rotas importam verifyToken daqui.
const verifyToken = auth;

// Papéis legados → novos (telas antigas podem mandar admin/user)
const normalizeRole = (role) => {
  const map = { admin: 'master', user: 'operacional', tecnico: 'master' };
  const r = (role || '').toLowerCase();
  return CLIENT_ROLES.includes(r) ? r : (map[r] || null);
};

// Um usuário não cria papel acima do seu (master cria os 3; técnico idem)
const canAssignRole = (creatorRole, targetRole) => {
  if (creatorRole === 'tecnico' || creatorRole === 'master') return CLIENT_ROLES.includes(targetRole);
  return false;
};

// POST /api/users — cria conta global (ou anexa existente) + acesso à empresa atual
const createUserController = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = normalizeRole(req.body.role);
    if (!name || !email) return res.status(400).json({ error: 'Nome e email obrigatórios' });
    if (!role) return res.status(400).json({ error: 'Papel inválido (use master, lider ou operacional)' });
    if (!canAssignRole(req.auth.role, role)) {
      return res.status(403).json({ error: 'Sem permissão para atribuir este papel' });
    }

    const result = await createOrAttachUser({
      name,
      email,
      password,
      role,
      companyId: req.auth.company_id,
      grantedBy: req.auth.account_id,
    });

    const mirror = await getUserById(result.local_user_id, req.auth.schema);
    const { password: _pw, ...safeMirror } = mirror || {};
    global.socketIoServer?.to(`schema_${req.auth.schema}`).emit('new_user', safeMirror);
    res.status(201).json({
      success: true,
      result: safeMirror,
      attached_existing_account: !result.created && result.attached,
    });
  } catch (err) {
    console.error('Erro ao criar usuário:', err.message);
    const msg = err.message.includes('Senha obrigatória') ? err.message : 'Erro ao criar usuário';
    res.status(500).json({ error: msg });
  }
};

// PUT /api/update-user — atualiza conta global + papel na empresa atual + espelho
const updateUserController = async (req, res) => {
  const { userId, userName, userEmail } = req.body;
  const role = normalizeRole(req.body.userRole);
  try {
    if (role && !canAssignRole(req.auth.role, role)) {
      return res.status(403).json({ error: 'Sem permissão para atribuir este papel' });
    }
    // Localiza a conta global pelo espelho local
    const uc = await pool.query(
      `SELECT * FROM effective_gain.user_companies WHERE local_user_id = $1 AND company_id = $2`,
      [userId, req.auth.company_id]
    );
    const membership = uc.rows[0];
    if (!membership) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa' });

    await updateAccountBasics(membership.account_id, { name: userName, email: userEmail });
    // Reset de senha pelo master (não exige a senha antiga; é o admin agindo sobre o time)
    if (req.body.newPassword) {
      if (membership.account_id === req.auth.account_id) {
        return res.status(400).json({ error: 'Use "Alterar minha senha" para trocar a própria senha' });
      }
      await setAccountPassword(membership.account_id, req.body.newPassword);
    }
    if (role && role !== membership.role) {
      await pool.query(
        `UPDATE effective_gain.user_companies SET role = $1 WHERE account_id = $2 AND company_id = $3`,
        [role, membership.account_id, req.auth.company_id]
      );
    }
    const account = await findAccountById(membership.account_id);
    await ensureMirrorUser(req.auth.schema, userId, account, role || membership.role);

    res.status(200).json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

// POST /api/change-password — o próprio usuário troca a senha (exige a senha atual)
const changeMyPasswordController = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter ao menos 8 caracteres' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });
    }
    const account = await findAccountById(req.auth.account_id);
    if (!account) return res.status(404).json({ error: 'Conta não encontrada' });
    const ok = await verifyPassword(account, currentPassword);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    await setAccountPassword(account.id, newPassword);
    res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error.message);
    res.status(500).json({ error: error.message || 'Erro ao alterar senha' });
  }
};

// DELETE /api/delete-user — revoga o acesso à empresa atual (espelho fica p/ histórico)
const deleteUserController = async (req, res) => {
  const { user_id } = req.body;
  try {
    const uc = await pool.query(
      `SELECT account_id FROM effective_gain.user_companies WHERE local_user_id = $1 AND company_id = $2`,
      [user_id, req.auth.company_id]
    );
    if (!uc.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa' });
    if (uc.rows[0].account_id === req.auth.account_id) {
      return res.status(400).json({ error: 'Você não pode revogar o próprio acesso' });
    }
    await revokeAccess(uc.rows[0].account_id, req.auth.company_id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao revogar usuário:', error.message);
    res.status(500).json({ error: 'Erro ao revogar usuário' });
  }
};

const getAllUsersController = async (req, res) => {
  const schema = req.params.schema;
  try {
    const result = await getAllUsers(schema);
    // Não expõe o hash/placeholder de senha
    res.status(200).json({ users: result.map(({ password, ...u }) => u) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Não foi possível exibir os usuários' });
  }
};

const searchUserByIdController = async (req, res) => {
  const { user_id, schema } = req.params;
  try {
    const result = await getUserById(user_id, schema);
    if (!result) return res.status(404).json({});
    const { password, ...user } = result;
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

const getOnlineUsersController = async (req, res) => {
  const schema = req.auth.schema;
  try {
    const result = await getOnlineUsers(schema);
    res.status(200).json({ users: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Não foi possível exibir os usuários' });
  }
};

const changeOfflineController = async (req, res) => {
  const { userID } = req.query;
  try {
    const result = await changeOffline(userID, req.auth.schema);
    res.status(200).json({ users: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar status' });
  }
};

module.exports = {
  createUserController,
  getAllUsersController,
  getOnlineUsersController,
  changeOfflineController,
  deleteUserController,
  updateUserController,
  changeMyPasswordController,
  searchUserByIdController,
  verifyToken,
};
