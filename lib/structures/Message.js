"use strict";

const Base = require("./Base");
const Server = require("./Server");
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
        this.timestamp = new Date(payload.timestamp);
        this.private = payload.private;
        this.author = client.users.has(payload.author.id) ? client.users.get(payload.author.id) : new User(payload.author, client);

        if (client.servers.has(payload.server_id)) this.server = client.servers.get(payload.server_id);
        else this.server = new Server({id: payload.server_id});
    }
}

module.exports = Message;