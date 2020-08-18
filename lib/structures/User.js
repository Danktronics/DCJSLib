"use strict";

const SnowflakeEntity = require("./SnowflakeEntity");

class User extends SnowflakeEntity {
    constructor(data, client) {
        super(data.id);
        this._client = client;

        this.automated = !!data.automated;
        this.flags = data.flags;
        this.update(data);
    }

    update(data) {
        if (data.username != undefined) this.username = data.username;
        if (data.avatar != undefined) this.avatar = data.avatar;
    }
}

module.exports = User;