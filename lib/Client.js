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
        let gatewayEndpoint = await this.requestHandler.request("GET", `http://localhost:4567/api/v${Constants.versions.gateway}/gateway/endpoint`);
        this.status = "CONNECTING";
        this.lastHeartbeatReceived = null;
        this.lastHeartbeatSent = null;

        this.ws = new WebSocket(`${gatewayEndpoint.url}?token=${this.token}`, {
            perMessageDeflate: false
        });

        this.ws.on("open", () => {
            this.status = "HANDSHAKING";
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
                    this.emit("ready");
                    break;
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
    createMessage(message, privateinfo) {
        this.ws.send(JSON.stringify({op: Constants.OPCODES.EVENT, message, privateinfo}));
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
                 * @prop {Array} memberList New member list
                 */
                this.emit("presenceUpdate", {user: new User(payload.user, this), memberList: payload.members});
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
}

module.exports = Client;