/**
 * Internal reference for structured classes
 * @param {Client} client Realtime client. (INTERNAL)
 */
class Base {
    constructor(client) {
        let _client = client;
        this.GC = () => { return _client; }
    }
}

module.exports = Base;