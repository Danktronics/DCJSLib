const Base = require("./Base");

/**
 * Represents DC Server
 * @extends Base
 * @prop {String} id Server id
 * @prop {String} name Server name
 * @prop {String} icon Server icon
 * @prop {Boolean} public Is server public?
 */
class Server extends Base {
    constructor(data, client) {
        super(client);

        this.update(data);
    }

    update(data) {
        this.id = data.id;
        this.name = data.name;
        this.icon = data.icon;
        this.public = data.public;
    }

    /**
     * Send message to server
     * @param {String} content 
     */
    send(content) {
        if (content == null) throw new Error("Content is empty");

        this._client.createMessage(this.id, content);
    }
}

module.exports = Server;