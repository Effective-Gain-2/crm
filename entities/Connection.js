class Connections{
    constructor(id, name, number, queues=[]){
        this.id=id
        this.name=name
        this.number=number
        this.queues=queues
    }
    getId() { return this.id; }
    getName() { return this.name; }
    getNumber() { return this.number }
    getQueues() { return this.queues }
}
module.exports = Connections