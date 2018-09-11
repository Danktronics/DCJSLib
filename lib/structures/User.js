"use strict";

const Base = require("./Base");
const Constants = require("../Constants");

/**
 * Represents DC user
 * @extends Base
 * @prop {Integer} id User id
 * @prop {String} username User username (display name)
 * @prop {String} avatar User avatar (The file name)
 * @prop {String} presence User presence (online or offline)
 */
class User extends Base {
    constructor(author, client) {
        super(client);

        this.id = author.id;
        this.username = author.username;
        this.avatar = author.avatar;
        this.presence = author.presence;
        this.bot = author.bot;
        this.admin = author.admin;
    }

    whisper(message) {
        if (this._client.status === "CONNECTED") {
            this._client.ws.send(JSON.stringify({op: Constants.OPCODES.EVENT, message, privateinfo: {id: this.id}}));
        } else return new Error("Client is not connected to DC.");
    }
}

module.exports = User;