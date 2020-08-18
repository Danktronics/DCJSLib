const User = require("./User");
const Presence = require("./Presence");

class Member {
    constructor(data, server, client) {
        this._client = client;

        this.server = server;
        this.createdAt = new Date(data.created_at);
        this.presence = new Presence({user: {id: this.id}});

        if (data.user) {
            let user = this._client.users.get(data.user.id);
            if (user != null) user.update(data.user);
            else {
                user = new User(data.user);
                this._client.users.set(user.id, user);
            }
            this.user = user;
        }

        this.update(data);
    }

    update(data) {
        if (data.joined_at !== undefined) this.joinedAt = data.joined_at;
        if (data.nickname !== undefined) this.nickname = data.nickname;
        if (data.roles !== undefined) this.roles = data.roles;
    }

    isOwner() {
        return this.user.id === this.server.ownerID;
    }
}

module.exports = Member;