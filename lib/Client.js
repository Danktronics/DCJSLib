"use strict";
const EventEmitter = require("events");
const WebSocket = require("ws");
const Constants = require("./Constants");
const Message = require("./structures/Message");
const User = require("./structures/User");
const Server = require("./structures/Server");
const RequestHandler = require("./RequestHandler");

const sleep = ms => new Promise((resolve) => setTimeout(resolve(), ms));

/**
 * Creates a Danktronics Chat client instance.
 * @extends EventEmitter
 * @param {String} token Bot token to authenticate with DC
 * @param {Object} options Bot options
 * @prop {String} status Connection status to DC
 * @prop {Number} ping Latency between client and server gateway
 */
class Client extends EventEmitter {
    constructor(token, options) {
        super();

        this.token = token;
        this.status = "DISCONNECTED";
        this.requestHandler = new RequestHandler(this);
        this.servers = new Map();
        this.users = new Map();
        if (options) this.options = options;
    }

    /**
     * Create a realtime connection to Danktronics chat
     */
    async connect() {
        try {
            let gatewayEndpoint = await this.getGateway();
            this.status = "CONNECTING";
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
            this.status = "AUTHENTICATING";
            this.ws.send(JSON.stringify({op: Constants.OPCODES.IDENTIFY, token: this.token}));
        });

        this.ws.on("message", async payload => {
            payload = JSON.parse(payload);
            switch (payload.op) {
                case Constants.OPCODES.EVENT:
                    this.wsEvent(payload);
                    break;
                case Constants.OPCODES.HEARTBEAT:
                    this.lastHeartbeatReceived = Date.now();
                    break;
                case Constants.OPCODES.HELLO:
                    this.status = "CONNECTED";
                    this.heartbeat();
                    this.heartbeatInterval = setInterval(() => this.heartbeat(), payload.d.heartbeat_interval);
                    if (this.options && this.options.waitForServers) await this.requestServers(); else this.requestServers();
                    this.emit("ready", payload.d.extendedUser);
                    break;
                case Constants.OPCODES.INVALID:
                    this.status = "DISCONNECTED";
                    this.emit("error", {code: payload.code, message: payload.d});
            }
        });
    }

    reconnect() {
        this.status = "RECONNECTING";
        this.connect();
    }

    disconnect() {
        this.ws.close();
        this.status = "DISCONNECTED";
    }

    get ping() {
        return this.lastHeartbeatReceived && this.lastHeartbeatSent ? this.lastHeartbeatReceived - this.lastHeartbeatSent : Infinity;
    }

    /**
     * Create and send a message
     * @param {String} serverID Server id
     * @param {String} message Message to send
     * @param {Object?} privateinfo Information to whisper to a user
     * @param {Number} privateinfo.id ID of user to whisper to 
     */
    createMessage(serverID, content, privateinfo) {
        if (serverID == null || content == null) throw "Invalid message info";
        this.ws.send(JSON.stringify({op: Constants.OPCODES.EVENT, message: content, server_id: serverID, privateinfo}));
    }

    heartbeat() {
        this.lastHeartbeatSent = Date.now();
        this.ws.send(JSON.stringify({op: Constants.OPCODES.HEARTBEAT}));
    }

    wsEvent(payload) {
        switch (payload.event) {
            case "MSG_CREATE":
                /**
                 * Fired when a message is received
                 * @event Client#message
                 * @prop {Message} message Message info
                 */
                this.emit("message", new Message(payload, this));
                break;
            case "PRESENCE_UPDATE":
                let user = new User(payload.user, this);
                this.users.set(user.id, user);

                /**
                 * Fired when a user has gone offline/online
                 * @event Client#presenceUpdate
                 * @prop {User} user Updated user
                 */
                this.emit("presenceUpdate", user);
                break;
            case "ERROR":
                /**
                 * Fired when an error occured on the client/server side
                 * @event Client#error
                 * @prop {String} error Error
                 */
                this.emit("error", payload.data);
                break;
        }
    }

    fetchMembers() {
        return new Promise(async (resolve, reject) => {
            let members = await this.requestHandler.request("GET", `https://chat.danktronics.org/api/v${Constants.versions.api}/members`);
            if (members == null) reject("Failed to fetch.");
            resolve(members);
        });
    }

    fetchMessages() {
        return new Promise(async (resolve, reject) => {
            let messages = await this.requestHandler.request("GET", `https://chat.danktronics.org/api/v${Constants.versions.api}/messages`);
            if (messages == null) reject("Failed to fetch");
            resolve(messages);
        });
    }

    getGateway() {
        return this.requestHandler.request("GET", `https://chat.danktronics.org/api/v${Constants.versions.api}/gateway/endpoint`);
    }

    async requestServers() {
        try {
            let serverRequest = await this.requestHandler.request("GET", `https://chat.danktronics.org/api/v${Constants.versions.api}/users/@me/servers`, true);
            if (serverRequest == null || serverRequest.servers.length === 0) return;

            let servers = serverRequest.servers;
            for (var serverI in servers) {
                var server = servers[serverI];
                this.servers.set(server.id, new Server(server, this));
            }
        } catch(error) {
            this.emit("error", error);
            await sleep(3000);
            return this.requestServers();
        }
    }
}

module.exports = Client;