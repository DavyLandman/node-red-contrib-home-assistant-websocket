/* global RED: false, $: false, exposeNode: false, ha: false, haServer: false, nodeVersion: false */
RED.nodes.registerType('ha-time', {
    category: 'home_assistant',
    color: ha.nodeColors.beta,
    outputs: 1,
    icon: 'font-awesome/fa-clock-o',
    paletteLabel: 'time',
    label: function () {
        return (
            this.name ||
            (this.entityId
                ? `${this.entityId}.${this.property || 'state'}`
                : 'time')
        );
    },
    labelStyle: ha.labelStyle,
    defaults: {
        name: { value: '' },
        server: { value: '', type: 'server', required: true },
        version: { value: RED.settings.haTimeVersion },
        exposeToHomeAssistant: { value: false },
        haConfig: {
            value: [
                { property: 'name', value: '' },
                { property: 'icon', value: '' },
            ],
        },
        entityId: { value: '', required: true },
        property: { value: '' },
        offset: { value: 0 },
        offsetType: { value: 'num' },
        offsetUnits: { value: 'minutes' },
        randomOffset: { value: false },
        repeatDaily: { value: false },
        payload: { value: '$entity().state' },
        payloadType: { value: 'jsonata' },
        debugenabled: { value: true },
    },
    oneditprepare: function () {
        nodeVersion.check(this);
        const node = this;

        haServer.init(node, '#node-input-server');
        haServer.autocomplete('entities', (entities) => {
            $('#node-input-entityId').autocomplete({
                source: entities,
                minLength: 2,
            });
        });
        haServer.autocomplete('properties', (properties) => {
            $('#node-input-property').autocomplete({
                source: properties,
                minLength: 2,
            });
        });
        exposeNode.init(this);
        $('#dialog-form').prepend(ha.betaWarning(313));

        $('#node-input-offset').typedInput({
            types: ['num', 'jsonata'],
            typeField: '#node-input-offsetType',
        });

        $('#node-input-payload').typedInput({
            types: ['str', 'num', 'bool', 'jsonata', 'date'],
            typeField: '#node-input-payloadType',
        });
    },
    oneditsave: function () {
        this.haConfig = exposeNode.getValues();
    },
});
