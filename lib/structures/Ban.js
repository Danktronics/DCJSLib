class Ban {
    constructor(data) {
        this.user = data.user;
        this.serverID = data.server_id;
        this.reason = data.reason;
    }
}

module.exports = Ban;