"use strict";

const SnowflakeEntity = require("./SnowflakeEntity");
const User = require("./User");

class Message extends SnowflakeEntity {
    constructor(data, client) {
        super(data.id);
        this._client = client;

        this.channel = client.servers.get(data.server_id).channels.get(data.channel_id);
        this.type = data.type;
        
        let user = client.users.get(data.author.id);
        if (user == null) {
            user = new User(data.author);
            client.users.set(user.id, user);
        } else user.update(data.author);
        this.author = user;
        
        let member = client.servers.get(data.server_id).members.get(user.id);
        if (data.member != null) {
            if (member == null) {
                member = new Member(data.member);
                client.servers.get(data.server_id).members.set(user.id, member);
            } else {
                member.update(data.member);
            }
        }
        this.member = member;

        this.update(data);
    }

    update(data) {
        if (data.content !== undefined) this.content = data.content;
        if (data.edited_at !== undefined) this.editedAt = new Date(data.edited_at);
        if (data.embeds !== undefined) this.embeds = data.embeds;
    }
}

module.exports = Message;