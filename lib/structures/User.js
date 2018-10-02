"use strict";

const Base = require("./Base");
const Constants = require("../Constants");

/**
 * Represents DC user
 * @extends Base
 * @prop {String} id User id
 * @prop {String} username User username (display name)
 * @prop {String} avatar User avatar (The file name)
 * @prop {String} presence User presence (online or offline)
 */
class User extends Base {
    constructor(data, client) {
        super(client);

        this.update(data);
    }

    update(data) {
        this.id = data.id;
        this.username = data.username;
        this.avatar = data.avatar;
        this.presence = data.presence;
        this.bot = data.bot;
        this.admin = data.admin;
    }
}

module.exports = User;