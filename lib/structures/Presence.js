class Presence {
    constructor(data) {
        this.user_id = data.user.id;

        this.update(data);
    }

    update(data) {
        if (data.status != undefined) this.status = data.status;
        if (data.activity != undefined) this.activity = data.activity;
    }
}

module.exports = Presence;