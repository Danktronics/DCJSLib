"use strict";

module.exports.baseURL = "https://chat.danktronics.org";

module.exports.Opcode = {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    HELLO: 3,
    INVALID_SESSION: 4,
    HEARTBEAT_ACK: 5,
    STATUS_UPDATE: 6,
    RESUME: 7
}

module.exports.ClientStatus = {
    WAITING: "WAITING",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    DISCONNECTED: "DISCONNECTED",
    IDENTIFYING: "IDENTIFYING"
}

module.exports.versions = {
    gateway: 5,
    api: 5
}