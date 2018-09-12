"use strict";

const Client = require("./lib/Client");

function DC(...args) {
    return new Client(...args);
}

module.exports = DC;