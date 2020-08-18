const SnowflakeEntity = require("./SnowflakeEntity");
const ServerChannel = require("./ServerChannel");
const Role = require("./Role");
const Member = require("./Member");

class Server extends SnowflakeEntity {
    constructor(data, client) {
        super(data.id);
        this._client = client;

        this.icon = data.icon;
        this.roles = new Map();
        this.channels = new Map();
        this.members = new Map();
        this.emojis = data.emojis;
        this.memberCount = data.member_count;

        if (data.roles) {
            for (let role of data.roles) {
                this.roles.set(role.id, new Role(role, this, this._client));
            }
        }

        if (data.channels) {
            for (let channel of data.channels) {
                this.channels.set(channel.id, new ServerChannel(channel, this, this._client));
            }
        }

        if (data.members) {
            for (let member of data.members) {
                this.members.set(member.user.id, new Member(member, this, this._client));
            }
        }

        if (data.presences) {
            for (let presence of data.presences) {
                let member = this.members.get(presence.user.id);
                if (!member) continue;
                member.presence.update(presence);
            }
        }

        this.update(data);
    }

    update(data) {
        if (data.name != undefined) this.name = data.name;
        if (data.icon != undefined) this.icon = data.icon;
        if (data.owner_id != undefined) this.ownerID = data.owner_id;
        if (data.features != undefined) this.features = data.features;
        if (data.special_url != undefined) this.specialURL = data.special_url;
        if (data.description != undefined) this.description = data.description;
    }

    async retrieveInvites() {
        return await this._client.retrieveServerInvites(this.id);
    }

    async retrieveBans() {
        return await this._client.retrieveServerBans(this.id);
    }
}

module.exports = Server;