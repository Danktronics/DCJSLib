class SnowflakeEntity {
    constructor(id) {
        this.id = id;
        this.createdAt = new Date(Math.floor(this.id / 4194303) + 1514764800000);
    }
}

module.exports = SnowflakeEntity;