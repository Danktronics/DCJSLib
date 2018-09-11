"use strict";

module.exports.eventMap = {
    MSG_CREATE: {
        event: "message"
    }
}

module.exports.presenceMap = {
    "Online": 1,
    "Offline": 2
};

module.exports.OPCODES = {
    EVENT: 0,
    HEARTBEAT: 1,
    HELLO: 2,
    IDENTIFY: 3,
    INVALID: 4
}

module.exports.versions = {
    gateway: 1,
    api: 1
}