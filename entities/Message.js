class Message {
  constructor(id, message, fromMe, chatId, createdAt) {
      this.id = id;
      this.message = message;
      this.fromMe = fromMe;
      this.chatId = chatId;
      this.createdAt = createdAt
  }

  getId(){
    return this.id
  }
  getMessage(){
    return this.message
  }
  getFromMe(){
    return this.fromMe
  }
  getCreatedAt(){
    return this.createdAt
  }
}

module.exports =  {Message} ;