"use strict"

const SnowflakeEntity = require("./SnowflakeEntity");

class ServerChannel extends SnowflakeEntity {
    constructor(data, server, client) {
        super(data.id);
        this._client = client;

        this.server = server;
        this.messages = new Map();

        this.update(data);
    }

    update(data) {
        if (data.type != undefined) this.type = data.type;
        if (data.name != undefined) this.name = data.name;
        if (data.position != undefined) this.position = data.position;
        if (data.topic != undefined) this.topic = data.topic;
        if (data.permission_overwrites != undefined) this.permissionOverwrites = data.permission_overwrites;
        if (data.latest_message_id != undefined) this.latestMessageID = data.latest_message_id;
    }

    async createMessage(content) {
        return await this._client.createChannelMessage(this.id, content);
    }

    async editMessage(messageID, content) {
        return await this._client.editChannelMessage(this.id, messageID, content);
    }

    async deleteMessage(id) {
        return await this._client.deleteChannelMessage(this.id, id);
    }
}

module.exports = ServerChannel;