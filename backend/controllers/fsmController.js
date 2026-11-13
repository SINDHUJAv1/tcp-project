const { activeFSM, FSM_STATES, FSM_INPUTS, TRANSITION_TABLE } = require('../engine/tcpFSM');
const failureDetector = require('../engine/failureDetector');
const storage = require('../models/storage');

const getFSMState = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      currentState: activeFSM.getCurrentState(),
      allowedTransitions: activeFSM.getAllowedTransitions(),
      history: activeFSM.getHistory()
    }
  });
};

const triggerTransition = async (req, res, next) => {
  try {
    const { event, hostname = 'interactive-fsm.local', port = 443 } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event/Symbol is required to trigger a state transition.'
      });
    }

    const result = activeFSM.transition(event);

    if (!result.success) {
      // Notify failure detector of protocol violation / invalid transition
      await failureDetector.emit('fsm:invalid_transition', {
        hostname,
        port,
        fromState: result.fromState,
        event: result.event,
        error: result.error,
        allowedEvents: result.allowedEvents
      });

      return res.status(400).json({
        success: false,
        error: result.error,
        fromState: result.fromState,
        attemptedEvent: result.event,
        allowedEvents: result.allowedEvents,
        details: `FSM transition rejected. The current state '${result.fromState}' does not accept input symbol '${result.event}'.`
      });
    }

    // Record valid transition event
    await storage.events.create({
      eventType: 'STATE_TRANSITION',
      source: 'FSM_ENGINE',
      hostname,
      port,
      severity: 'INFO',
      description: `FSM transitioned from '${result.fromState}' to '${result.toState}' via symbol '${result.event}'.`
    });

    res.status(200).json({
      success: true,
      data: {
        currentState: activeFSM.getCurrentState(),
        transition: result,
        allowedTransitions: activeFSM.getAllowedTransitions()
      },
      message: `State transitioned successfully: ${result.fromState} -> ${result.toState}`
    });
  } catch (err) {
    next(err);
  }
};

const resetFSM = (req, res) => {
  const state = activeFSM.reset();
  res.status(200).json({
    success: true,
    data: {
      currentState: state,
      allowedTransitions: activeFSM.getAllowedTransitions(),
      history: activeFSM.getHistory()
    },
    message: 'FSM reset to Closed state.'
  });
};

const getFormalSpec = (req, res) => {
  res.status(200).json({
    success: true,
    data: activeFSM.getFormalDefinition()
  });
};

module.exports = {
  getFSMState,
  triggerTransition,
  resetFSM,
  getFormalSpec
};
