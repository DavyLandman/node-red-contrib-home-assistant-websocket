const cloneDeep = require('lodash.clonedeep');

const EventsHaNode = require('./EventsHaNode');

const nodeOptions = {
    config: {
        entities: {},
        tags: {},
        devices: {},
    },
};

class Tag extends EventsHaNode {
    constructor({ node, config, RED, status }) {
        super({ node, config, RED, status, nodeOptions });

        this.addEventClientListener(
            `ha_events:tag_scanned`,
            this.onTagScanned.bind(this)
        );
    }

    async onTagScanned(evt) {
        if (this.isEnabled === false) return;

        const { event } = cloneDeep(evt);
        const { device_id: deviceId, tag_id: tagId } = event;

        if (!this.isValidTag(tagId) || !this.isValidDevice(deviceId)) return;

        const tagName = this.getTagName(tagId);
        const payload = {
            tag_name: tagName,
            user_id: evt.context.user_id,
            ...event,
        };

        const msg = {
            topic: tagId,
            payload,
        };

        this.status.setSuccess(`${tagName || tagId} scanned`);
        this.send(msg);
    }

    isValidTag(tag) {
        return this.nodeConfig.tags.includes(tag);
    }

    isValidDevice(deviceId) {
        const devices = this.nodeConfig.devices;
        return devices.length === 0 || devices.includes(deviceId);
    }

    getTagName(tagId) {
        return this.homeAssistant.getTags().find((tag) => tag.tag_id === tagId)
            .name;
    }
}

module.exports = Tag;
