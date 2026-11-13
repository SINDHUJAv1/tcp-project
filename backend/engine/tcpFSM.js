/**
 * TCP Finite State Machine (FSM) Engine
 * Formal Automaton: M = (Q, Sigma, delta, q0, F)
 * 
 * Q = { 'Closed', 'Connecting', 'Established', 'Waiting', 'Terminated', 'Failed', 'Timeout' }
 * q0 = 'Closed'
 * F = { 'Terminated', 'Failed', 'Timeout' }
 */

const FSM_STATES = {
  CLOSED: 'Closed',
  CONNECTING: 'Connecting',
  ESTABLISHED: 'Established',
  WAITING: 'Waiting',
  TERMINATED: 'Terminated',
  FAILED: 'Failed',
  TIMEOUT: 'Timeout'
};

const FSM_INPUTS = {
  SYN_SENT: 'SYN_SENT',
  SYN_ACK_RCVD: 'SYN_ACK_RCVD',
  ACK_SENT: 'ACK_SENT',
  DATA_TRANSFER: 'DATA_TRANSFER',
  FIN_SENT: 'FIN_SENT',
  FIN_ACK_RCVD: 'FIN_ACK_RCVD',
  RST_RCVD: 'RST_RCVD',
  TIMEOUT_TRIGGER: 'TIMEOUT_TRIGGER',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RESET_FSM: 'RESET_FSM',
  RETRY_CONNECT: 'RETRY_CONNECT'
};

// Formal Transition Table delta(State, Event) -> NextState
const TRANSITION_TABLE = {
  [FSM_STATES.CLOSED]: {
    [FSM_INPUTS.SYN_SENT]: {
      nextState: FSM_STATES.CONNECTING,
      description: 'Client generates initial sequence number and sends SYN packet.'
    },
    [FSM_INPUTS.RESET_FSM]: {
      nextState: FSM_STATES.CLOSED,
      description: 'System remains in Closed idle state.'
    }
  },
  [FSM_STATES.CONNECTING]: {
    [FSM_INPUTS.SYN_ACK_RCVD]: {
      nextState: FSM_STATES.ESTABLISHED,
      description: 'Server responds with SYN-ACK; client immediately acknowledges with ACK.'
    },
    [FSM_INPUTS.ACK_SENT]: {
      nextState: FSM_STATES.ESTABLISHED,
      description: '3-way handshake completed with final client ACK.'
    },
    [FSM_INPUTS.RST_RCVD]: {
      nextState: FSM_STATES.FAILED,
      description: 'Remote host actively rejected connection attempt with TCP RST.'
    },
    [FSM_INPUTS.TIMEOUT_TRIGGER]: {
      nextState: FSM_STATES.TIMEOUT,
      description: 'SYN retransmission timeout elapsed without server response.'
    },
    [FSM_INPUTS.NETWORK_ERROR]: {
      nextState: FSM_STATES.FAILED,
      description: 'Underlying network unreachable or IP routing exception.'
    }
  },
  [FSM_STATES.ESTABLISHED]: {
    [FSM_INPUTS.DATA_TRANSFER]: {
      nextState: FSM_STATES.ESTABLISHED,
      description: 'Data segment successfully transmitted and acknowledged (self-loop).'
    },
    [FSM_INPUTS.FIN_SENT]: {
      nextState: FSM_STATES.WAITING,
      description: 'Client initiated graceful teardown by sending FIN segment.'
    },
    [FSM_INPUTS.RST_RCVD]: {
      nextState: FSM_STATES.FAILED,
      description: 'Connection abruptly reset by remote peer or intermediate middlebox.'
    },
    [FSM_INPUTS.TIMEOUT_TRIGGER]: {
      nextState: FSM_STATES.TIMEOUT,
      description: 'Keepalive or unacknowledged data segment timed out.'
    },
    [FSM_INPUTS.NETWORK_ERROR]: {
      nextState: FSM_STATES.FAILED,
      description: 'Network link broken while session was established.'
    }
  },
  [FSM_STATES.WAITING]: {
    [FSM_INPUTS.FIN_ACK_RCVD]: {
      nextState: FSM_STATES.TERMINATED,
      description: 'Remote peer acknowledged FIN; 4-way teardown completed.'
    },
    [FSM_INPUTS.TIMEOUT_TRIGGER]: {
      nextState: FSM_STATES.TIMEOUT,
      description: 'Time-Wait timer expired before final peer acknowledgment.'
    },
    [FSM_INPUTS.RST_RCVD]: {
      nextState: FSM_STATES.FAILED,
      description: 'Teardown interrupted by peer reset.'
    }
  },
  [FSM_STATES.TERMINATED]: {
    [FSM_INPUTS.RESET_FSM]: {
      nextState: FSM_STATES.CLOSED,
      description: 'Socket resources deallocated, returning to Closed state.'
    }
  },
  [FSM_STATES.FAILED]: {
    [FSM_INPUTS.RESET_FSM]: {
      nextState: FSM_STATES.CLOSED,
      description: 'Reset socket error context back to Closed state.'
    },
    [FSM_INPUTS.RETRY_CONNECT]: {
      nextState: FSM_STATES.CONNECTING,
      description: 'Retrying connection establishment by transmitting new SYN.'
    }
  },
  [FSM_STATES.TIMEOUT]: {
    [FSM_INPUTS.RESET_FSM]: {
      nextState: FSM_STATES.CLOSED,
      description: 'Reset timeout state back to Closed.'
    },
    [FSM_INPUTS.RETRY_CONNECT]: {
      nextState: FSM_STATES.CONNECTING,
      description: 'Retrying connection establishment after timeout expiration.'
    }
  }
};

class TCPFiniteStateMachine {
  constructor(initialState = FSM_STATES.CLOSED) {
    this.currentState = initialState;
    this.history = [
      {
        from: null,
        to: initialState,
        event: 'INIT',
        timestamp: new Date().toISOString(),
        description: 'FSM initialized in initial state ' + initialState
      }
    ];
  }

  getCurrentState() {
    return this.currentState;
  }

  getHistory() {
    return this.history;
  }

  getTransitionTable() {
    return TRANSITION_TABLE;
  }

  getAllowedTransitions(state = this.currentState) {
    const validMap = TRANSITION_TABLE[state] || {};
    return Object.keys(validMap).map(input => ({
      event: input,
      nextState: validMap[input].nextState,
      description: validMap[input].description
    }));
  }

  /**
   * Executes a state transition
   * Returns { success, fromState, toState, event, description, error }
   */
  transition(inputEvent) {
    const fromState = this.currentState;
    const stateTransitions = TRANSITION_TABLE[fromState];

    if (!stateTransitions || !stateTransitions[inputEvent]) {
      const allowed = this.getAllowedTransitions(fromState).map(t => t.event);
      const errorMsg = `Invalid state transition: State '${fromState}' cannot accept input symbol '${inputEvent}'. Valid symbols from '${fromState}' are: [${allowed.join(', ')}].`;
      return {
        success: false,
        fromState,
        toState: fromState,
        event: inputEvent,
        error: errorMsg,
        allowedEvents: allowed
      };
    }

    const transitionMeta = stateTransitions[inputEvent];
    const toState = transitionMeta.nextState;
    this.currentState = toState;

    const record = {
      from: fromState,
      to: toState,
      event: inputEvent,
      timestamp: new Date().toISOString(),
      description: transitionMeta.description
    };
    this.history.push(record);

    return {
      success: true,
      fromState,
      toState,
      event: inputEvent,
      description: transitionMeta.description,
      record
    };
  }

  reset() {
    this.currentState = FSM_STATES.CLOSED;
    this.history.push({
      from: this.history[this.history.length - 1]?.to || 'Unknown',
      to: FSM_STATES.CLOSED,
      event: FSM_INPUTS.RESET_FSM,
      timestamp: new Date().toISOString(),
      description: 'FSM explicitly reset to Closed state'
    });
    return this.currentState;
  }

  getFormalDefinition() {
    return {
      name: 'TCP Connection Finite State Automaton',
      formalTuple: 'M = (Q, Σ, δ, q0, F)',
      states: Object.values(FSM_STATES),
      alphabet: Object.values(FSM_INPUTS),
      initialState: FSM_STATES.CLOSED,
      finalStates: [FSM_STATES.TERMINATED, FSM_STATES.FAILED, FSM_STATES.TIMEOUT],
      transitionTable: TRANSITION_TABLE,
      languageDescription: 'The regular language L(M) of all valid TCP connection sequences from initialization to teardown or terminal failure.'
    };
  }
}

// Global active instance for interactive state visualizer
const activeFSM = new TCPFiniteStateMachine();

module.exports = {
  FSM_STATES,
  FSM_INPUTS,
  TRANSITION_TABLE,
  TCPFiniteStateMachine,
  activeFSM
};
