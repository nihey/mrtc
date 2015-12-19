(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["module"] = factory();
	else
		root["module"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var getRandomString = function getRandomString(length) {
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

	var getRTC = function getRTC() {
	  return {
	    RTCPeerConnection: window.RTCPeerConnection || window.msRTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
	    RTCIceCandidate: window.RTCIceCandidate || window.msRTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate,
	    RTCSessionDescription: window.RTCSessionDescription || window.msRTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription
	  };
	};

	var MRTC = (function () {
	  /* Minimal RTC Wrapper
	   *
	   * @param {Object={}} options They can be:
	   *   {Object|Boolean} channel Does this peer have a DataChannel? If so, you can
	   *                    setup some custom config for it
	   *   {MediaStream} stream The MediaStream object to be send to the other peer
	   *   {Object={iceServers: []}} options RTCPeerConnection initialization options
	   */

	  function MRTC() {
	    var _this = this;

	    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	    _classCallCheck(this, MRTC);

	    options.options = options.options || { iceServers: [] };

	    // Normalize dataChannel option into a object
	    if (options.dataChannel && typeof options.dataChannel === 'boolean') {
	      options.dataChannel = {};
	    }

	    this.stream = options.stream;

	    // Event System
	    this.events = {
	      signal: []
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
	    this.peer.onicecandidate = function (event) {
	      // Nothing to do if no candidate is specified
	      if (!event.candidate) {
	        return;
	      }

	      return _this._onSignal(event.candidate);
	    };

	    this.peer.ondatachannel = function (event) {
	      _this.channel = event.channel;
	      _this._bindChannel();
	    };

	    this.peer.onaddstream = function (event) {
	      _this.stream = event.stream;
	      _this.trigger('add-stream', [_this.stream]);
	    };

	    if (this.stream) {
	      this.peer.addStream(options.stream);
	    }

	    if (options.offerer) {
	      if (options.dataChannel) {
	        this.channel = this.peer.createDataChannel(getRandomString(128), options.dataChannel);
	        this._bindChannel();
	      }

	      this.peer.createOffer(function (description) {
	        _this.peer.setLocalDescription(description, function () {
	          return _this._onSignal(description);
	        }, _this.onError);
	      }, this.onError);
	      return;
	    }
	  }

	  /*
	   * Private
	   */

	  /* Emit Ice candidates that were waiting for a remote description to be set */

	  _createClass(MRTC, [{
	    key: '_flushIces',
	    value: function _flushIces() {
	      this._remoteSet = true;
	      var ices = this._ices;
	      this._ices = [];

	      ices.forEach(function (ice) {
	        this.addSignal(ice);
	      }, this);
	    }

	    /* Bind all events related to dataChannel */
	  }, {
	    key: '_bindChannel',
	    value: function _bindChannel() {
	      ['open', 'close', 'message', 'error', 'buffered-amount-low'].forEach(function (action) {
	        var _this2 = this;

	        this.channel['on' + action.replace(/-/g, '')] = function () {
	          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	            args[_key] = arguments[_key];
	          }

	          _this2.trigger('channel-' + action, [].concat(args));
	        };
	      }, this);
	    }

	    /* Bubble signal events or accumulate then into an array */
	  }, {
	    key: '_onSignal',
	    value: function _onSignal(signal) {
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
	  }, {
	    key: 'addSignal',
	    value: function addSignal(signal) {
	      var _this3 = this;

	      if (signal.type === 'offer') {
	        return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), function () {
	          _this3._flushIces();
	          _this3.peer.createAnswer(function (description) {
	            _this3.peer.setLocalDescription(description, function () {
	              _this3._onSignal(description);
	            }, _this3.onError);
	          }, _this3.onError);
	        }, this.onError);
	      }
	      if (signal.type === 'answer') {
	        return this.peer.setRemoteDescription(new this.wrtc.RTCSessionDescription(signal), function () {
	          _this3._flushIces();
	        }, this.onError);
	      }
	      if (!this._remoteSet) {
	        return this._ices.push(signal);
	      }

	      this.peer.addIceCandidate(new this.wrtc.RTCIceCandidate(signal), function () {}, this.onError);
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
	  }, {
	    key: 'on',
	    value: function on(action, callback) {
	      // Tell the user if the action he has input was invalid
	      if (this.events[action] === undefined) {
	        return console.error('MRTC: No such action \'' + action + '\'');
	      }

	      this.events[action].push(callback);

	      // on Signal event is added, check the '_signals' array and flush it
	      if (action === 'signal') {
	        this._signals.forEach(function (signal) {
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
	  }, {
	    key: 'off',
	    value: function off(action, callback) {
	      if (callback) {
	        // If a callback has been specified delete it specifically
	        var index = this.events[action].indexOf(callback);
	        index !== -1 && this.events[action].splice(index, 1);
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
	  }, {
	    key: 'trigger',
	    value: function trigger(action, args) {
	      args = args || [];
	      // Fire all events with the given callback
	      this.events[action].forEach(function (callback) {
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
	  }, {
	    key: 'onError',
	    value: function onError(error) {
	      console.error(error);
	    }
	  }]);

	  return MRTC;
	})();

	exports['default'] = MRTC;
	module.exports = exports['default'];

/***/ }
/******/ ])
});
;