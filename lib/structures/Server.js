const Base = require("./Base");

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

    send(content) {
        if (content == null) throw new Error("Content is empty");

        this._client.createMessage(this.id, content);
    }
}

module.exports = Server;