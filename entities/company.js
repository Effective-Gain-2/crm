class Company {
    constructor(id, name, superAdmin) {
        this.id = id;
        this.name = name;
        this.superAdmin = superAdmin;
        this.users = [];
        this.queues = [];
    }

    getId() { return this.id; }
    setId(id) { this.id = id; }

    getName() { return this.name; }
    setName(name) { this.name = name; }

    getSuperAdmin() { return this.superAdmin; }
    setSuperAdmin(superAdmin) { this.superAdmin = superAdmin; }

    getUsers() { return this.users; }

    addUser(user) {
        this.users.push(user);
    }

    removeUser(user) {
        this.users = this.users.filter(u => u !== user); 
    }
}

module.exports = { Company };