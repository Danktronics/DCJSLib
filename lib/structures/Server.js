const Base = require("./Base");
const Constants = require("../Constants");

class Server extends Base {
    constructor(payload, client) {
        super(client);

        this.id = payload.server_id;
    }

    send(content) {
        if (content == null) throw "Invalid content";

        this._client.ws.send(JSON.stringify({op: Constants.OPCODES.EVENT, message: content, server_id: this.id}));
    }
}

module.exports = Server;