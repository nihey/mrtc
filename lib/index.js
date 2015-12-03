var getRandomString = function(length) {
  // Do not use Math.random().toString(32) for length control
  var universe = 'abcdefghijklmnopqrstuvwxyz';
  universe += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  universe += '0123456789';

  var string = '';
  for (var i = 0; i < length; ++i) {
    string += universe[Math.floor((universe.length - 1) * Math.random())];
  }
  return string;
};

var getRTC = function() {
  return {
    RTCPeerConnection: (
      window.RTCPeerConnection ||
      window.msRTCPeerConnection ||
      window.mozRTCPeerConnection ||
      window.webkitRTCPeerConnection
    ),
    RTCIceCandidate: (
      window.RTCIceCandidate ||
      window.msRTCIceCandidate ||
      window.mozRTCIceCandidate ||
      window.webkitRTCIceCandidate
    ),
    RTCSessionDescription: (
      window.RTCSessionDescription ||
      window.msRTCSessionDescription ||
      window.mozRTCSessionDescription ||
      window.webkitRTCSessionDescription
    ),
  };
};

/* Minimal RTC Wrapper
 *
 * @class
 * @param {Object={}} options They can be:
 *   {Object|Boolean} channel Does this peer have a DataChannel? If so, you can
 *                    setup some custom config for it
 *   {MediaStream} stream The MediaStream object to be send to the other peer
 *   {Object={iceServers: []}} options RTCPeerConnection initialization options
 */
function MRTC(options) {
  // Default options
  options = options || {};
  options.options = options.options || {iceServers: []};

  // Normalize dataChannel option into a object
  if (options.dataChannel && typeof options.dataChannel === 'boolean') {
    options.dataChannel = {};
  }

  this.stream = options.stream;

  // Event System
  this.events = {
    signal: [],
  }

  // Stream Events
  this.events['add-stream'] = [];

  // DataChannel Events
  this.events['channel-open'] = [];
  this.events['channel-message'] = [];
  this.events['channel-close'] = [];
  this.events['channel-error'] = [];
  this.events['channel-buffered-amount-low'] = [];

  // Holds signals if the user has not been hearing for the just yet
  this._signals = [];

  this.wrtc = options.wrtc || getRTC();
  if (!this.wrtc.RTCPeerConnection) {
    return console.error("No WebRTC support found");
  }

  this.peer = new this.wrtc.RTCPeerConnection(options.options);
  this.peer.onicecandidate = function(event) {
    // Nothing to do if no candidate is specified
    if (!event.candidate) {
      return;
    }

    return this._onSignal(event.candidate);
  }.bind(this);

  this.peer.ondatachannel = function(event) {
    this.channel = event.channel;
    this._bindChannel();
  }.bind(this);

  this.peer.onaddstream = function(event) {
    this.stream = event.stream;
    this.trigger('add-stream', [this.stream]);
  }.bind(this);

  if (this.stream) {
    this.peer.addStream(options.stream);
  }

  if (options.offerer) {
    if (options.dataChannel) {
      this.channel = this.peer.createDataChannel(getRandomString(128), options.dataChannel);
      this._bindChannel();
    }

    this.peer.createOffer(function(description) {
      this.peer.setLocalDescription(description, function() {
        return this._onSignal(description);
      }.bind(this), this.onError);
    }.bind(this), this.onError);
    return;
  }
}

/*
 * Private
 */

/* Bind all events related to dataChannel */
MRTC.prototype._bindChannel = function() {
  ['open', 'close', 'message', 'error', 'buffered-amount-low'].forEach(function(action) {
    this.channel['on' + action.replace(/-/g, '')] = function() {
      this.trigger('channel-' + action, Array.prototype.slice.call(arguments));
    }.bind(this);
  }, this);
};

/* Bubble signal events or accumulate then into an array */
MRTC.prototype._onSignal = function(signal) {
  // Capture signals if the user has not been hearing for the just yet
  if (this.events.signal.length === 0) {
    return this._signals.push(signal);
  }

  // in case the user is already hearing for signal events fire it
  this.trigger('signal', [signal]);
};

/*
 * Misc
 */

/* Add a signal into the peer connection
 *
 * @param {RTCSessionDescription|RTCIceCandidate} The signalling data
 */
MRTC.prototype.addSignal = function(signal) {
  if (signal.type === 'offer') {
    return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), function() {
      this.peer.createAnswer(function(description) {
        this.peer.setLocalDescription(description, function() {
          this._onSignal(description);
        }.bind(this), this.onError);
      }.bind(this), this.onError);
    }.bind(this), this.onError);
  }
  if (signal.type === 'answer') {
    return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), function() {
    }, this.onError);
  }

  this.peer.addIceCandidate(new this.wrtc.RTCIceCandidate(signal), function() {}, this.onError);
};

/*
 * Event System
 */

  // Event System
  this.events = {
    signal: [],
  }

  // Stream Events
  this.events['add-stream'] = [];

  // DataChannel Events
  this.events['channel-open'] = [];
  this.events['channel-message'] = [];
  this.events['channel-close'] = [];
  this.events['channel-error'] = [];
  this.events['channel-buffered-amount-low'] = [];

/* Attach an event callback
 *
 * Event callbacks may be:
 *
 * signal -> A new signal is generated (may be either ice candidate or description)
 *
 * add-stream -> A new MediaSteam is received
 *
 * channel-open -> DataChannel connection is opened
 * channel-message -> DataChannel is received
 * channel-close -> DataChannel connection is closed
 * channel-error -> DataChannel error ocurred
 * channel-buffered-amount-low -> DataChannel bufferedAmount drops to less than
 *                                or equal to bufferedAmountLowThreshold
 *
 * Multiple callbacks may be attached to a single event
 *
 * @param {String} action Which action will have a callback attached
 * @param {Function} callback What will be executed when this event happen
 */
MRTC.prototype.on = function(action, callback) {
  this.events[action].push(callback);

  // on Signal event is added, check the '_signals' array and flush it
  if (action === 'signal') {
    this._signals.forEach(function(signal) {
      this.trigger('signal', [signal]);
    });
  }
};

/* Detach an event callback
 *
 * @param {String} action Which action will have event(s) detached
 * @param {Function} callback Which function will be detached. If none is
 *                            provided all callbacks all callbacks are detached
 */
MRTC.prototype.off = function(action, callback) {
  if (callback) {
    // If a callback has been specified delete it specifically
    var index = this.events[action].indexOf(callback);
    (index !== -1) && this.events[action].splice(index, 1);
    return index !== -1;
  }

  // Else just erase all callbacks
  this.events[action] = [];
};

/* Trigger a event
 *
 * @param {String} action Which event will be triggered
 * @param {Array} args Which arguments will be provided to the callbacks
 */
MRTC.prototype.trigger = function(action, args) {
  args = args || [];
  // Fire all events with the given callback
  this.events[action].forEach(function(callback) {
    callback.apply(null, args);
  });
};

/*
 * Logging
 */

/* Log errors
 *
 * @param {Error} error Error to be logged
 */
MRTC.prototype.onError = function(error) {
  console.error(error);
};

module.exports = MRTC;
