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

export default class MRTC {
  /* Minimal RTC Wrapper
   *
   * @param {Object={}} options They can be:
   *   {Object|Boolean} channel Does this peer have a DataChannel? If so, you can
   *                    setup some custom config for it
   *   {MediaStream} stream The MediaStream object to be send to the other peer
   *   {Object={iceServers: []}} options RTCPeerConnection initialization options
   */
  constructor(options={}) {
    options.options = options.options || {iceServers: [
      {
        url: 'stun:23.21.150.121', // Old WebRTC API (url)
        urls: [                    // New WebRTC API (urls)
          'stun:23.21.150.121',
          'stun:stun.l.google.com:19302',
          'stun:stun.services.mozilla.com',
        ],
      },
    ]};

    // Normalize dataChannel option into a object
    if (options.dataChannel && typeof options.dataChannel === 'boolean') {
      options.dataChannel = {};
    }

    this.stream = options.stream;

    // Event System
    this.events = {
      signal: [],
    };

    // Has the remote offer/answer been set yet?
    this._remoteSet = false;
    // Ice candidates generated before remote description has been set
    this._ices = [];

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
    this.peer.onicecandidate = event => {
      // Nothing to do if no candidate is specified
      if (!event.candidate) {
        return;
      }

      return this._onSignal(event.candidate);
    };

    this.peer.ondatachannel = event => {
      this.channel = event.channel;
      this._bindChannel();
    };

    this.peer.onaddstream = event => {
      this.stream = event.stream;
      this.trigger('add-stream', [this.stream]);
    };

    if (this.stream) {
      this.peer.addStream(options.stream);
    }

    if (options.offerer) {
      if (options.dataChannel) {
        this.channel = this.peer.createDataChannel(getRandomString(128), options.dataChannel);
        this._bindChannel();
      }

      this.peer.createOffer(description => {
        this.peer.setLocalDescription(description, () => {
          return this._onSignal(description);
        }, this.onError);
      }, this.onError);
      return;
    }
  }

  /*
   * Private
   */

  /* Emit Ice candidates that were waiting for a remote description to be set */
  _flushIces() {
    this._remoteSet = true;
    let ices = this._ices;
    this._ices = [];

    ices.forEach(function(ice) {
      this.addSignal(ice);
    }, this);
  }

  /* Bind all events related to dataChannel */
  _bindChannel() {
    ['open', 'close', 'message', 'error', 'buffered-amount-low'].forEach(function(action) {
      this.channel['on' + action.replace(/-/g, '')] = (...args) => {
        this.trigger('channel-' + action, [...args]);
      };
    }, this);
  }

  /* Bubble signal events or accumulate then into an array */
  _onSignal(signal) {
    // Capture signals if the user has not been hearing for the just yet
    if (this.events.signal.length === 0) {
      return this._signals.push(signal);
    }

    // in case the user is already hearing for signal events fire it
    this.trigger('signal', [signal]);
  }

  /*
   * Misc
   */

  /* Add a signal into the peer connection
   *
   * @param {RTCSessionDescription|RTCIceCandidate} The signalling data
   */
  addSignal(signal) {
    if (signal.type === 'offer') {
      return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), () => {
        this._flushIces();
        this.peer.createAnswer(description => {
          this.peer.setLocalDescription(description, () => {
            this._onSignal(description);
          }, this.onError);
        }, this.onError);
      }, this.onError);
    }
    if (signal.type === 'answer') {
      return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), () => {
        this._flushIces();
      }, this.onError);
    }
    if (!this._remoteSet) {
      return this._ices.push(signal);
    }

    this.peer.addIceCandidate(new this.wrtc.RTCIceCandidate(signal), () => {}, this.onError);
  }

  /*
   * Event System
   */

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
  on(action, callback) {
    // Tell the user if the action he has input was invalid
    if (this.events[action] === undefined) {
      return console.error(`MRTC: No such action '${action}'`);
    }

    this.events[action].push(callback);

    // on Signal event is added, check the '_signals' array and flush it
    if (action === 'signal') {
      this._signals.forEach(function(signal) {
        this.trigger('signal', [signal]);
      }, this);
    }
  }

  /* Detach an event callback
   *
   * @param {String} action Which action will have event(s) detached
   * @param {Function} callback Which function will be detached. If none is
   *                            provided all callbacks are detached
   */
  off(action, callback) {
    if (callback) {
      // If a callback has been specified delete it specifically
      var index = this.events[action].indexOf(callback);
      (index !== -1) && this.events[action].splice(index, 1);
      return index !== -1;
    }

    // Else just erase all callbacks
    this.events[action] = [];
  }

  /* Trigger an event
   *
   * @param {String} action Which event will be triggered
   * @param {Array} args Which arguments will be provided to the callbacks
   */
  trigger(action, args) {
    args = args || [];
    // Fire all events with the given callback
    this.events[action].forEach(function(callback) {
      callback.apply(null, args);
    });
  }

  /*
   * Logging
   */

  /* Log errors
   *
   * @param {Error} error Error to be logged
   */
  onError(error) {
    console.error(error);
  }
}
