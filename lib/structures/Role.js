const SnowflakeEntity = require("./SnowflakeEntity");

class Role extends SnowflakeEntity {
    constructor(data, server, client) {
        super(data.id);
        this._client = client;

        this.server = server;

        this.update(data);
    }

    update(data) {
        if (data.name != undefined) this.name = data.name;
        if (data.color != undefined) this.color = data.color;
        if (data.hoist != undefined) this.hoist = data.hoist;
        if (data.position != undefined) this.position = data.position;
        if (data.permissions != undefined) this.permissions = data.permissions;
        if (data.mentionable != undefined) this.mentionable = data.mentionable;
    }
}

module.exports = Role;