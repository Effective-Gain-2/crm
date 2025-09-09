const pool = require('../db/queries');

const disableBott = async(chat_id, schema)=>{
  try{
    const result = await pool.query(
      `UPDATE ${schema}.chats SET isboton = $1 where id = $2`,[false, chat_id]
    )
    return result.rows[0];
  }catch(error){
    console.error(error)
  }
}

module.exports ={
    disableBott
}