"use strict";

const EventEmitter = require("events");
const WebSocket = require("ws");
const { Opcode, ClientStatus } = require("./Constants");
const Message = require("./structures/Message");
const User = require("./structures/User");
const Server = require("./structures/Server");
const Ban = require("./structures/Ban");
const RequestHandler = require("./RequestHandler");

const sleep = ms => new Promise((resolve) => setTimeout(resolve(), ms));

/**
 * Creates a Danktronics Chat client instance.
 * @extends EventEmitter
 * @param {String} token Token to authenticate with DC
 * @prop {String} status Connection status to DC
 * @prop {Number} ping Latency between client and server gateway
 * @prop {Map.<String, Server>} servers Map of servers the client is in (the key is the ID of the server)
 * @prop {Map.<String, User>} users Map of users the client has access to (the key is the ID of the user)
 * @prop {User} user Client user connected to the gateway
 */
class Client extends EventEmitter {
    constructor(token) {
        super();

        this.token = token;
        this.status = ClientStatus.DISCONNECTED;
        this.requestHandler = new RequestHandler(this);
        this.servers = new Map();
        this.users = new Map();
        this.user = null;
        this.sequence = null;
    }

    /**
     * Create a realtime connection to Danktronics chat
     */
    async connect() {
        try {
            let gatewayEndpoint = await this.getGateway();
            this.status = ClientStatus.CONNECTING;
            this.lastHeartbeatReceived = null;
            this.lastHeartbeatSent = null;

            this.ws = new WebSocket(`${gatewayEndpoint.url}`, {
                perMessageDeflate: false
            });

            this.registerListeners();
        } catch(error) {
            this.emit("error", error);
            await sleep(5000);
            return this.connect();
        }
    }

    registerListeners() {
        if (this.ws == null) {
            this.emit("error", new Error("Start up called before connection was established."));
            return;
        }

        this.ws.on("open", () => {
            this.status = ClientStatus.IDENTIFYING;
        });

        this.ws.on("close", async code => {
            this.status = ClientStatus.DISCONNECTED;
            if (this.heartbeatInterval != null) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            await sleep(3000);
            this.connect();
        });

        this.ws.on("message", async payload => {
            payload = JSON.parse(payload);
            switch (payload.op) {
                case Opcode.DISPATCH:
                    this.sequence = payload.s;
                    this.handleWebsocketEvent(payload);
                    break;
                case Opcode.HEARTBEAT_ACK:
                    this.lastHeartbeatReceived = Date.now();
                    this.lastHeartbeatAcknowledged = true;
                    break;
                case Opcode.HELLO:
                    this.heartbeatInterval = setInterval(() => this.heartbeat(), payload.d.heartbeat_interval);
                    this.status = ClientStatus.IDENTIFYING;
                    if (this.sessionID != null && this.resumeAttempts < 3) {
                        this.resumeAttempts++;
                        this.sendWS({op: Opcode.RESUME, d: {token: this.token, session_id: this.sessionID, sequence: this.sequence}});
                    } else {
                        this.ready = false;
                        this.sendWS({op: Opcode.IDENTIFY, d: {token: this.token, os: process.platform, browser: process.platform, device: "JS Library"}});
                    }
                    break;
                case Opcode.INVALID_SESSION:
                    if (!payload.d) {
                        this.sessionID = null;
                    }
                    this.reconnect();
            }    
        });
    }

    sendWS(data) {
        this.ws.send(JSON.stringify(data));
    }

    /**
     * Reconnects to DC
     */
    reconnect() {
        this.ws.close();
        this.status = ClientStatus.CONNECTING;
        this.connect();
    }

    /**
     * Disconnect from DC
     */
    disconnect() {
        this.ws.close();
        this.status = ClientStatus.DISCONNECTED;
    }

    get ping() {
        return this.lastHeartbeatReceived && this.lastHeartbeatSent ? this.lastHeartbeatReceived - this.lastHeartbeatSent : Infinity;
    }

    /**
     * Sends a message in a channel
     * @param {String} channelID ID of the channel to send message
     * @param {String} content content of the message
     */
    async createChannelMessage(channelID, content) {
        let message = await this.requestHandler.request("POST", `/channels/${channelID}/messages`, {content});
        return new Message(message, this);
    }

    /**
     * Deletes a message
     * @param {String} channelID ID of the channel the message is in
     * @param {String} messageID ID of the message to delete
     */
    async deleteChannelMessage(channelID, messageID) {
        return await this.requestHandler.request("DELETE", `/channels/${channelID}/messages/${messageID}`);
    }

    /**
     * Edit a message created by the client
     * @param {String} channelID ID of the channel the message is in
     * @param {String} messageID ID of the message to edit
     * @param {String} content New content
     */
    async editChannelMessage(channelID, messageID, content) {
        return await this.requestHandler.request("PATCH", `/channels/${channelID}/messages/${messageID}`, {content});
    }

    heartbeat() {
        this.lastHeartbeatSent = Date.now();
        this.sendWS({op: Opcode.HEARTBEAT, d: this.sequence});
    }

    handleWebsocketEvent(payload) {
        switch (payload.t) {
            case "READY": {
                this.user = new User(payload.d.user, this);
                this.users.set(this.user.id, this.user);
                this.status = ClientStatus.CONNECTED;
                this.sessionID = payload.d.session_id;
                this.unavailableServers = payload.d.servers;
                this.resumeAttempts = 0;

                if (this.unavailableServers.length === 0) {
                    this.ready = true;
                    this.emit("ready");
                }
                break;
            }
            case "SERVER_CREATE": {
                if (this.status == ClientStatus.CONNECTED) {
                    let server = new Server(payload.d, this);
                    this.servers.set(server.id, server);

                    if (this.ready) {
                        this.emit("serverCreate", server);
                        break;
                    }
                    
                    for (let i = 0; i < this.unavailableServers.length; i++) {
                        if (this.unavailableServers[i].id === server.id) {
                            this.unavailableServers.splice(i, 1);
                        }
                    }
                    this.emit("serverAvailable", server);
                    if (!this.ready && this.unavailableServers.length === 0) {
                        this.ready = true;
                        this.emit("ready");
                    }
                }
                break;
            }
            case "SERVER_UPDATE": {
                let server = this.servers.get(payload.d.id);
                server.update(payload.d);
                this.emit("serverUpdate", this.servers.get(payload.d.id));
                break;
            }
            case "SERVER_DELETE": {
                let server = this.servers.get(payload.d.id);
                this.emit("serverDelete", server);
                this.servers.delete(payload.d.id);
                break;
            }
            case "PRESENCE_UPDATE": {
                let user = this.users.get(payload.d.user.id);
                if (user != null) user.update(payload.d.user);
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let member = server.members.get(payload.d.user.id);
                if (member == null) break;
                member.presence.update(payload.d.presence);
                this.emit("presenceUpdate", member);
                break;
            }
            case "MESSAGE_CREATE": {
                let channel = this.servers.get(payload.d.server_id).channels.get(payload.d.channel_id);
                if (channel == null) break;
                let message = new Message(payload.d, this);
                channel.messages.set(message.id, message);
                this.emit("messageCreate", message);
                break;
            }
            case "MESSAGE_UPDATE": {
                let channel = this.servers.get(payload.d.server_id).channels.get(payload.d.channel_id);
                if (channel == null) break;
                let message = channel.messages.get(payload.d.id);
                message.update(payload.d);
                this.emit("messageUpdate", channel.messages.get(payload.d.id), message);
                break;
            }
            case "MESSAGE_DELETE": {
                let channel = this.servers.get(payload.d.server_id).channels.get(payload.d.channel_id);
                if (channel == null) break;
                let message = channel.messages.get(payload.d.id);
                channel.messages.delete(message.id);
                this.emit("messageDelete", message);
                break;
            }
            case "CHANNEL_CREATE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let channel = new ServerChannel(payload.d, server, this);
                server.channels.set(channel.id, channel);
                this.emit("channelCreate", channel);
                break;
            }
            case "CHANNEL_DELETE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let channel = server.channels.get(payload.d.id);
                if (channel == null) {
                    this.emit("channelDelete", new ServerChannel(payload.d, server, this));
                } else {
                    server.channels.delete(channel.id);
                    this.emit("channelDelete", channel);
                }
                break;
            }
            case "INVITE_CREATE": {
                this.emit("inviteCreate", payload.d.invite);
                break;
            }
            case "INVITE_DELETE": {
                this.emit("inviteDelete", payload.d);
                break;
            }
            case "SERVER_ROLE_CREATE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let role = new Role(payload.d.role);
                server.roles.set(role.id, role);
                this.emit("roleCreate", role);
                break;
            }
            case "SERVER_ROLE_UPDATE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                server.roles.get(payload.d.role.id).update(payload.d.role);
                this.emit("roleUpdate", server.roles.get(payload.d.role.id));
                break;
            }
            case "SERVER_ROLE_DELETE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let role = server.roles.get(payload.d.role_id);
                server.roles.delete(role.id);
                this.emit("roleDelete", role);
                break;
            }
            case "SERVER_MEMBER_ADD": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let member = new Member(payload.d, server, this);
                server.members.set(member.user.id, member);
                this.emit("serverMemberAdd", member);
                break;
            }
            case "SERVER_MEMBER_UPDATE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let member = server.members.get(payload.d.user.id);
                if (member == null) break;
                member.update(payload.d);
                this.emit("serverMemberUpdate", member);
                break;
            }
            case "SERVER_MEMBER_REMOVE": {
                let server = this.servers.get(payload.d.server_id);
                if (server == null) break;
                let member = server.members.get(payload.d.user.id);
                if (member == null) break;
                server.members.delete(member.user.id);
                this.emit("serverMemberRemove", member.user.id);
                break;
            }
            case "SERVER_BAN_ADD": {
                this.emit("serverBanAdd", new Ban(payload.d));
                break;
            }
            case "SERVER_BAN_REMOVE": {
                this.emit("serverBanRemove", new Ban(payload.d));
                break;
            }
        }
    }

    getGateway() {
        return this.requestHandler.request("GET", "/gateway/endpoint", null, false);
    }
}

module.exports = Client;