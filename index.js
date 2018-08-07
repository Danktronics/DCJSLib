"use strict";

const Client = require("./lib/Client");

function DC(token) {
    return new Client(token);
}

module.exports = DC;