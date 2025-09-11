class Users {
    constructor(id, name, email, password, permission) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.permission = permission;
        this.online = false;
        this.queue = [];
    }

    getId() { return this.id; }
    getName() { return this.name; }
    getEmail() { return this.email; } 
    getPassword() { return this.password; } 
    getPermission() { return this.permission; }

    setName(name) { this.name = name; }
    setEmail(email) { this.email = email; }
    setPermission(permission) { this.permission = permission; }

    isOnline() { return this.online; }
    setOnline(boolean) { this.online = boolean; }

    addQueue(queueId) {
        this.queue.push(queueId);
    }

    removeQueue(queueId) {
        this.queue = this.queue.filter(q => q !== queueId);
    }
}

module.exports = { Users };