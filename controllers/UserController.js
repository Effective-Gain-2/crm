const { createUser, getAllUsers, searchUser, changeOnline, getOnlineUsers, changeOffline, deleteUser, updateUser, getUserById} = require('../services/UserService');
const { Users } = require('../entities/Users');
const { v4: uuidv4 } = require('uuid');

const createUserController = async (req, res) => {
    try {
      const { name, email, password, permission } = req.body;
  
      const user = new Users(
        uuidv4(),
        name,
        email,
        password,
        permission
      );
  
        const schema = req.body.schema;
        const result = await createUser(user, schema);

      res.status(201).json(result);
  
    } catch (err) {
      console.error("Erro ao criar usuário:", err.message);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  };
  const updateUserController = async (req, res) => {
    const { userId, userName, userEmail, userRole } = req.body;
    const schema = req.body.schema;
    try {
      const result = await updateUser(userId, userName, userEmail, userRole, schema);
      res.status(200).json({
        message: 'Usuário atualizado com sucesso',
      })
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error.message);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }
const getAllUsersController = async(req, res)=>{
  const schema = req.params.schema
    try{
        const result = await getAllUsers(schema)
        res.status(201).json({
            users:result
          
        })
    }catch(error){
        res.status(500).json({
            message:'Não foi possivel exibir os usuários'

        })
        console.log(error)
    }
}
const searchUserController = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await searchUser(email, password);

    if (!result) {
      return res.status(404).json({});
    }

    console.log("Usuário encontrado:", result);

    changeOnline(result.user.id, result.company.schema_name);

    res.status(200).json({
      success: true,
      user: result.user,
      role: result.user.permission,
      company: result.company,
      schema: result.company.company_name
    });

  } catch (error) {
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }

}

const searchUserByIdController = async (req, res) => {
  const { user_id, schema } = req.params;


  try {
    const result = await getUserById(user_id, schema);

    if (!result) {
      return res.status(404).json({});
    }

    res.status(200).json({
      success: true,
      user: result,
    });

  } catch (error) {
    console.error("Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}
const getOnlineUsersController = async (req, res) => {
  const { schema } = req.query 
  try {
    const result = await getOnlineUsers(schema);
    res.status(201).json({
      users: result,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Não foi possível exibir os usuários',
    });
  }
  
};

const changeOfflineController = async(req, res)=>{
  const { userID } = req.query 
  const schema = req.param?.schema
  try {
    const result = await changeOffline(userID, schema)
    res.status(201).json({
      users: result,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: error,
    });
  }
}
const deleteUserController = async(req, res)=>{
  const {user_id} = req.body
  const schema = req.body.schema

  console.log(user_id)
  try{
    const result = await deleteUser(user_id, schema)
    res.status(204).json({
      users: result,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: error,
    });
  }
}
  module.exports = {
    createUserController,
    getAllUsersController,
    searchUserController,
    getOnlineUsersController,
    changeOfflineController,
    deleteUserController,
    updateUserController,
    searchUserByIdController
  }