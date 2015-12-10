# Minimal RTC Wrapper

[![Dependency Status](https://david-dm.org/nihey/mrtc.png)](https://david-dm.org/nihey/mrtc)

RTCPeerConnection Wrapper for purists. No dependencies (just ~1.5KB gzipped).
```
$ npm install --save mrtc
```

# Why Should I Use It?

There are a lot of RTCPeerConnection wrappers around there, but a lot of them
miss an important point: **Sometimes you don't need a lot of dependencies and
200+ commit repos to do your duty**.

RTCPeerConnection API is a bit complicated, but not that complicated, this
module wraps just what you need to do your signalling, establish a connection,
and send [MediaStream/DataChannel] data - it also exposes to you all the native
events of the RTCPeerConnection API.

# What is RTC/WebRTC?

> WebRTC is a open source project aiming to enable the web with Real Time
> Communication (RTC) capabilities

-[webrtc.org](http://www.webrtc.org/)

Basically it allow you to make RTC between two browser peers (or a NodeJS peer,
if you're using [node-wrtc](https://www.npmjs.com/package/wrtc)). Data is
streamed between two peers without the need of a central server gateway.

# How does WebRTC work?

In a nutshell, considering two peers, A and B:

<p align="center">
  <img src="https://raw.githubusercontent.com/nihey/mrtc/master/docs/img/a-and-b.png"/>
</p>

In order to connect to each other they need to exchange some `data`, this `data`
is called `signals`. Peer B needs `signals` to peer A to establish a connection
(peer A also needs `signals` from peer B).

<p align="center">
  <img src="https://raw.githubusercontent.com/nihey/mrtc/master/docs/img/a-and-b-signals.gif"/>
</p>

These `signals` have to be transported somehow from peer A to peer B, and for
this you need a `signalling server`.

<p align="center">
  <img src="https://raw.githubusercontent.com/nihey/mrtc/master/docs/img/a-and-b-signalling-0.png"/>
</p>

A `signalling server` can transport `signals` between peers by a series of
means, whether it will be `[polling](http://stackoverflow.com/a/6835879)`,
`[long-polling](http://techoctave.com/c7/posts/60-simple-long-polling-example-with-javascript-and-jquery/)`
or, my personal favorite, `[websocket](https://davidwalsh.name/websocket)`.

<p align="center">
  <img src="https://raw.githubusercontent.com/nihey/mrtc/master/docs/img/a-and-b-signalling-exchange.gif"/>
</p>

Once you found your way to transport these `signals` between them, peer A and
peer B will be connected. That means you no longer need the `signalling server`,
as data will be transported between these two peers directly.

<p align="center">
  <img src="https://raw.githubusercontent.com/nihey/mrtc/master/docs/img/a-and-b-connected.gif"/>
</p>

# How does MRTC Work?

First, you must define your peers:
```javascript
var MRTC = require('mrtc');

var peerA = new MRTC({dataChannel: true, offerer: true});
var peerB = new MRTC({dataChannel: true});
```

Then you must listen for signal events:
```javascript
peerA.on('signal', function(signal) {
  // Send this `signal` somehow to peerB
});

peerB.on('signal', function(signal) {
  // Send this `signal` somehow to peerA
});
```

When you managed to find a way to send the signal between the peers:
```javascript
// A adds a signal from B
peerA.addSignal(signalB);

// The same for peerB
peerB.addSignal(signalA);
```

After trading all the signals, the peer connection will be established:
```javascript
peerA.on('channel-open', function() {
  // Connected to B
  peerA.channel.send('Hey!!')
});

peerB.on('channel-open', function() {
  // Connected to A
  peerB.channel.send('Hello there!');
});
```

Data can be received via the `channel-message` event, all `channel-*` events
are received as the [data channel event handling
api](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel#Event_Handlers):
```javascript
peerA.on('channel-message', function(event) {
  console.log(event.data); // -> Hello there!
});
```

Streams are available via the `add-stream` event (but you must have initialized
MRTC with a stream)
```javascript
// If you had initialized MRTC like:
//
// navigator.getUserMedia({audio: true, video: true}, function(stream) {
//  var peerA = new MRTC({stream: stream});
// });

peerB.on('add-stream', function(stream) {
  // Received the peerA's stream
});
```

To use MRTC in a Node environment, you should use `[wrtc](https://www.npmjs.com/package/wrtc)`:
```javascript
var MRTC = require('mrtc');

var peerA = new MRTC({wrtc: require('wrtc'), dataChannel: true, offerer: true});
...
```

# API

```javascript
/* Minimal RTC Wrapper
 *
 * @param {Object={}} options They can be:
 *   {Object|Boolean} dataChannel Does this peer have a DataChannel? If so,
 *                    you can setup some custom config for it
 *   {MediaStream} stream The MediaStream object to be send to the other peer
 *   {Object={iceServers: []}} options RTCPeerConnection initialization options
 */
constructor(options={})

// new MRTC({dataChannel: {ordered: false}});
```

```javascript
/* Add a signal into the peer connection
 *
 * @param {RTCSessionDescription|RTCIceCandidate} The signalling data
 */
addSignal(signal)

// peer.addSignal(signal)
```
```javascript
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
on(action, callback)

// peer.on('channel-message', function(event) {
//   // Received something
// });
```
```javascript
/* Detach an event callback
 *
 * @param {String} action Which action will have event(s) detached
 * @param {Function} callback Which function will be detached. If none is
 *                            provided all callbacks are detached
 */
off(action, callback)

// peer.off('channel-message');
```
```javascript
/* Trigger an event
 *
 * @param {String} action Which event will be triggered
 * @param {Array} args Which arguments will be provided to the callbacks
 */
trigger(action, args)

// peer.trigger('channel-message', [{data: 'Hello there'}]);
```

# License

This code is released under
[CC0](http://creativecommons.org/publicdomain/zero/1.0/) (Public Domain)
