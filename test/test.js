var wrtc = require('wrtc'),
    MRTC = require('../dist/mrtc.js');

var assert = require('assert');

describe('Minimal RTC Wrapper', function() {
  var peerA = new MRTC({wrtc: wrtc, dataChannel: true, offerer: true});
  var peerB = new MRTC({wrtc: wrtc});

  it('Only PeerA should have a dataChannel', function() {
    assert.equal(typeof peerA.channel, "object");
    assert.equal(typeof peerB.channel, "undefined");
  });

  it('Should be able to connect', function(done) {
    var calls = 0;
    // Try calling the done callback
    var tryDone = function() {
      calls += 1;
      if (calls === 2) {
        done();
      }
    };

    peerA.on('signal', function(signal) {
      peerB.addSignal(signal);
    });

    peerB.on('signal', function(signal) {
      peerA.addSignal(signal);
    });

    peerA.on('channel-open', function() {
      tryDone();
    });

    peerB.on('channel-open', function() {
      tryDone();
    });
  });

  it('Should be able to trade messages', function(done) {
    var calls = 0;
    // Try calling the done callback
    var tryDone = function() {
      calls += 1;
      if (calls === 6) {
        done();
      }
    };

    // Send message via JSON
    var send = function(peer, data) {
      peer.channel.send(JSON.stringify(data));
    };

    peerA.on('channel-message', function(event) {
      var data = JSON.parse(event.data);
      if (data.type === 1) {
        assert.equal(data.message, "Here's to you, Hon");
        return tryDone();
      } else if (data.type === 2) {
        assert.equal(data.message, 'Beasts all over the shop');
        return tryDone();
      } else if (data.type === 3) {
        assert.equal(data.message, 'They played us like a damn fiddle');
        return tryDone();
      }

      assert.equal(true, false);
    });

    peerB.on('channel-message', function(event) {
      var data = JSON.parse(event.data);
      if (data.type === 1) {
        assert.equal(data.message, "It's ours, we built it dammit");
        return tryDone();
      } else if (data.type === 2) {
        assert.equal(data.message, 'There is no place for me here...');
        return tryDone();
      } else if (data.type === 3) {
        assert.equal(data.message, 'I will choose the truth I like');
        return tryDone();
      }

      assert.equal(true, false);
    });

    send(peerB, {
      type: 1,
      message: "Here's to you, Hon",
    });
    send(peerB, {
      type: 2,
      message: 'Beasts all over the shop',
    });
    send(peerB, {
      type: 3,
      message: 'They played us like a damn fiddle',
    });

    send(peerA, {
      type: 1,
      message: "It's ours, we built it dammit",
    });
    send(peerA, {
      type: 2,
      message: 'There is no place for me here...',
    });
    send(peerA, {
      type: 3,
      message: 'I will choose the truth I like',
    });
  });

  it('Should be calling channel close', function(done) {
    var calls = 0;
    // Try calling the done callback
    var tryDone = function() {
      calls += 1;
      if (calls === 2) {
        done();
      }
    };

    peerA.on('channel-close', function() {
      tryDone();
    });

    peerB.on('channel-close', function() {
      tryDone();
    });

    peerB.channel.close();
  });
});
