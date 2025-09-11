const { Message } = require('./Message');

class Chat {
    constructor(id, serialized, connectionId, queueId=null, isGroup=false, contact, assignedUser, status, createdAt, messages = []) {
        this.id = id;
        this.chatID = serialized;
        this.connectionId = connectionId;
        this.queueId = queueId;
        this.isGroup = isGroup;
        this.contact = contact;
        this.assignedUser = assignedUser;
        this.status = status
        this.createdAt = createdAt;
        this.messages = messages;
    }

    addMessage(id, content, fromMe) {
        const msg = new Message(id, content, fromMe, this.id, this.contact, new Date());
        this.messages.push(msg);
    }
    getId(){
        return this.id
    }
    getChatId(){
        return this.chatID
    }
    getIsGroup(){
        return this.isGroup
    }
    getContact(){
        return this.contact
    }
    getCreatedAt(){
        return this.createdAt
    }
    getMessages(){
        return this.messages
    }
    getConnectionId(){
        return this.connectionId
    }
    getQueueId(){
        return this.queueId
    }
    getAssignedUser(){
        return this.assignedUser
    }
    getStatus(){
        return this.status
    }
    


}

module.exports = { Chat };