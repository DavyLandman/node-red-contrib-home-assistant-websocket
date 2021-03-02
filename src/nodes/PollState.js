const ta = require('time-ago');

const EventsHaNode = require('./EventsHaNode');

const nodeOptions = {
    config: {
        entity_id: (nodeDef) => (nodeDef.entity_id || '').trim(),
        updateinterval: (nodeDef) =>
            !isNaN(nodeDef.updateinterval)
                ? Number(nodeDef.updateinterval)
                : 60,
        updateIntervalUnits: {},
        outputinitially: {},
        outputonchanged: {},
        state_type: {},
        halt_if: {},
        halt_if_type: {},
        halt_if_compare: {},
    },
};

class PollState extends EventsHaNode {
    constructor({ node, config, RED }) {
        super({ node, config, RED, nodeOptions });

        if (!this.nodeConfig.entity_id) {
            throw new Error('Entity Id is required');
        }

        if (!this.timer) {
            const interval = this.nodeConfig.updateinterval;

            switch (this.nodeConfig.updateIntervalUnits) {
                case 'minutes':
                    this.updateInterval = interval * (60 * 1000);
                    break;
                case 'hours':
                    this.updateInterval = interval * (60 * 60 * 1000);
                    break;
                default:
                    this.updateInterval = interval * 1000;
            }
            this.timer = setInterval(
                this.onTimer.bind(this),
                this.updateInterval
            );
        }

        if (this.nodeConfig.outputonchanged) {
            this.addEventClientListener(
                `ha_events:state_changed:${this.nodeConfig.entity_id}`,
                this.onTimer.bind(this)
            );
        }

        if (this.nodeConfig.outputinitially) {
            if (this.isHomeAssistantRunning) {
                this.onTimer();
            } else {
                this.addEventClientListener(
                    'ha_client:initial_connection_ready',
                    this.onTimer.bind(this)
                );
            }
        }
    }

    onClose(removed) {
        super.onClose(removed);
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    onTimer(triggered = false) {
        if (!this.isHomeAssistantRunning || this.isEnabled === false) {
            return;
        }

        const pollState = this.homeAssistant.getStates(
            this.nodeConfig.entity_id
        );
        if (!pollState) {
            this.node.error(
                `could not find state with entity_id "${this.nodeConfig.entity_id}"`,
                {}
            );
            this.status.setText(
                `no state found for ${this.nodeConfig.entity_id}`
            );
            return;
        }

        const dateChanged = this.calculateTimeSinceChanged(pollState);
        if (!dateChanged) {
            this.node.error(
                `could not calculate time since changed for entity_id "${this.nodeConfig.entity_id}"`,
                {}
            );
            return;
        }
        pollState.timeSinceChanged = ta.ago(dateChanged);
        pollState.timeSinceChangedMs = Date.now() - dateChanged.getTime();

        // Convert and save original state if needed
        this.castState(pollState, this.nodeConfig.state_type);

        const msg = {
            topic: this.nodeConfig.entity_id,
            payload: pollState.state,
            data: pollState,
        };

        let isIfState;
        try {
            isIfState = this.getComparatorResult(
                this.nodeConfig.halt_if_compare,
                this.nodeConfig.halt_if,
                pollState.state,
                this.nodeConfig.halt_if_type,
                {
                    entity: pollState,
                }
            );
        } catch (e) {
            this.status.setFailed('Error');
            this.node.error(e.message, {});
            return;
        }

        const statusMessage = `${pollState.state}${
            triggered === true ? ` (triggered)` : ''
        }`;

        // Check 'if state' and send to correct output
        if (this.nodeConfig.halt_if && !isIfState) {
            this.status.setFailed(statusMessage);
            this.send([null, msg]);
            return;
        }

        this.status.setSuccess(statusMessage);
        this.send([msg, null]);
    }

    getNodeEntityId() {
        return this.nodeConfig.entity_id;
    }

    triggerNode(eventMessage) {
        this.onTimer(true);
    }

    calculateTimeSinceChanged(entityState) {
        const entityLastChanged = entityState.last_changed;
        return new Date(entityLastChanged);
    }
}

module.exports = PollState;
