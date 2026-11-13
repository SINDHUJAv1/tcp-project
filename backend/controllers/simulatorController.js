const tcpSimulator = require('../engine/tcpSimulator');
const slidingWindow = require('../engine/slidingWindow');

const getSession = async (req, res, next) => {
  try {
    const session = tcpSimulator.getSession();
    res.status(200).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

const connect = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateConnect(req.body || {});
    res.status(200).json({
      success: true,
      data: result,
      message: `Simulated TCP connect executed in scenario: ${req.body.scenario || 'NORMAL_HANDSHAKE'}`
    });
  } catch (err) {
    next(err);
  }
};

const sendData = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateSendData(req.body || {});
    res.status(200).json({
      success: true,
      data: result,
      message: 'TCP data segment transmitted and acknowledged.'
    });
  } catch (err) {
    next(err);
  }
};

const corruptPacket = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateCorruptPacket(req.body || {});
    res.status(200).json({
      success: true,
      data: result,
      message: 'Simulated transit packet corruption: Checksum mismatch detected!'
    });
  } catch (err) {
    next(err);
  }
};

const wait = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateWait(req.body || {});
    res.status(200).json({
      success: true,
      data: result,
      message: 'TCP idle keep-alive wait completed.'
    });
  } catch (err) {
    next(err);
  }
};

const disconnect = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateDisconnect();
    res.status(200).json({
      success: true,
      data: result,
      message: 'TCP 4-way handshake teardown finalized.'
    });
  } catch (err) {
    next(err);
  }
};

const reset = async (req, res, next) => {
  try {
    const result = await tcpSimulator.simulateReset();
    res.status(200).json({
      success: true,
      data: result,
      message: 'Simulation session reset to initial Closed state.'
    });
  } catch (err) {
    next(err);
  }
};

// --- Sliding Window Flow Control Endpoints ---

const getSlidingWindow = async (req, res, next) => {
  try {
    const state = slidingWindow.getState();
    res.status(200).json({
      success: true,
      data: state
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowSend = async (req, res, next) => {
  try {
    const bytes = req.body?.bytes ? Number(req.body.bytes) : 512;
    const state = await slidingWindow.sendData(bytes);
    res.status(200).json({
      success: true,
      data: state,
      message: `Transmitted ${bytes}B within advertised receiver window.`
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowAck = async (req, res, next) => {
  try {
    const state = await slidingWindow.sendAck();
    res.status(200).json({
      success: true,
      data: state,
      message: 'ACK transmitted. Sliding window shifted forward.'
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowFillBuffer = async (req, res, next) => {
  try {
    const state = await slidingWindow.fillReceiverBuffer();
    res.status(200).json({
      success: true,
      data: state,
      message: 'Receiver buffer saturated: Advertised window dropped to 0 (Zero Window).'
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowFreeBuffer = async (req, res, next) => {
  try {
    const bytes = req.body?.bytes ? Number(req.body.bytes) : 2048;
    const state = await slidingWindow.freeReceiverBuffer(bytes);
    res.status(200).json({
      success: true,
      data: state,
      message: `Application consumed ${bytes}B: Window Update broadcasted with rwnd = ${state.advertisedWindow}B.`
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowProbe = async (req, res, next) => {
  try {
    const state = await slidingWindow.sendZeroWindowProbe();
    res.status(200).json({
      success: true,
      data: state,
      message: 'Zero Window Probe (ZWP) 1-byte segment transmitted.'
    });
  } catch (err) {
    next(err);
  }
};

const slidingWindowReset = async (req, res, next) => {
  try {
    const state = slidingWindow.reset();
    res.status(200).json({
      success: true,
      data: state,
      message: 'Sliding window flow control reset to initial 4096B window.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSession,
  connect,
  sendData,
  corruptPacket,
  wait,
  disconnect,
  reset,
  getSlidingWindow,
  slidingWindowSend,
  slidingWindowAck,
  slidingWindowFillBuffer,
  slidingWindowFreeBuffer,
  slidingWindowProbe,
  slidingWindowReset
};
