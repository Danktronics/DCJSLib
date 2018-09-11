/**
 * Internal reference for structured classes
 * @param {Client} client Realtime client. (INTERNAL)
 */
class Base {
    constructor(client) {
        Object.defineProperty(this, "_client", {
            value: client
        });
    }
}

module.exports = Base;