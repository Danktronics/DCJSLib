"use strict";
const EventEmitter = require("events");
const WebSocket = require("ws");
const Constants = require("./Constants");
const Message = require("./structures/Message");
const User = require("./structures/User");
const RequestHandler = require("./RequestHandler");

/**
 * Creates a Danktronics Chat client instance.
 * @extends EventEmitter
 * @param {String} token Bot token to authenticate with DC
 * @prop {String} status Connection status to DC
 * @prop {Number} ping Latency between client and server gateway
 */
class Client extends EventEmitter {
    constructor(token) {
        super();
        this.token = token;
        this.status = "DISCONNECTED";
        this.requestHandler = new RequestHandler();
    }

    /**
     * Create a realtime connection to Danktronics chat
     */
    async connect() {
        let gatewayEndpoint = await this.requestHandler.request("GET", `https://chat.danktronics.org/api/v${Constants.versions.gateway}/gateway/endpoint`);
        this.status = "CONNECTING";
        this.lastHeartbeatReceived = null;
        this.lastHeartbeatSent = null;

        this.ws = new WebSocket(`${gatewayEndpoint.url}`, {
            perMessageDeflate: false
        });

        this.ws.on("open", () => {
            this.status = "AUTHENTICATING";
            this.ws.send(JSON.stringify({op: Constants.OPCODES.IDENTIFY, token: this.token}));
        });

        this.ws.on("message", payload => {
            payload = JSON.parse(payload);
            //Process opcode
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
                /**
                 * Fired when a user has gone offline/online
                 * @event Client#presenceUpdate
                 * @prop {User} user Updated user
                 */
                this.emit("presenceUpdate", {user: new User(payload.user, this)});
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
}

module.exports = Client;