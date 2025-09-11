class Queue{
    constructor(id, name, color, users=[]){
        this.id = id;
        this.name=name;
        this.color=color;
        this.users=users;

    }
    getId(){
        return this.id
    }
    getName(){
        return this.name
    }
    getColor(){
        return this.color
    }
    getUsers(){
        return this.users
    }
    addUser(user){
        this.users.push(user)
    }
    removeUser(user) {
        this.users = this.users.filter(u => u !== user); 
    }
    
}
module.exports = Queue
