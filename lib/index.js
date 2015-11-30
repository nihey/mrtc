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

function MRTC(options) {
  // Default options
  options = options || {};
  options.iceServers = options.iceServers || [];

  // Event System
  this.events = {
    signal: [],
  };

  // Holds signals if the user has not been hearing for the just yet
  this._signals = [];

  this.wrtc = options.wrtc || getRTC;
  if (!this.wrtc.RTCPeerConnection) {
    return console.error("No WebRTC support found");
  }

  this.peer = new this.wrtc.RTCPeerConnection({iceServers: options.iceServers});
  this.peer.onicecandidate = function(event) {
    // Nothing to do if no candidate is specified
    if (!event.candidate) {
      return;
    }

    return this._onSignal(event.candidate);
  };

  if (options.offerer) {
    this.peer.createOffer(function(description) {
      this.setLocalDescription(description, function() {
        return this._onSignal(description);
      }.bind(this), this.onError);
    }.bind(this), this.onError);
  }
}

/*
 * Private
 */

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

  this.peer.addIceCandidate(new this.wrtc.RTCIceCandidate(signal));
};

/*
 * Event System
 */

MRTC.prototype.on = function(action, callback) {
  this.events.push(callback);

  // on Signal event is added, check the '_signals' array and flush it
  if (action === 'signal') {
    this._signals.forEach(function(signal) {
      this.trigger('signal', [signal]);
    });
  }
};

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

MRTC.prototype.onError = function(error) {
  console.error(error);
};
