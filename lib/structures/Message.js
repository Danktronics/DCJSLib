"use strict";

const Base = require("./Base");
const User = require("./User");

/**
 * Represents a message from DC
 * @extends Base
 * @prop {String} content Message content
 * @prop {Date} timestamp Message timestamp (locally)
 * @prop {User} author Message author
 */
class Message extends Base {
    constructor(payload, client) {
        super(client);

        this.content = payload.content;
        this.timestamp = new Date();
        payload.author.presence = "Online";
        this.author = new User(payload.author, client);
    }
}

module.exports = Message;