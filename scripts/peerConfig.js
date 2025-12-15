
var peer;
function startPeer(x) {
    peer = new Peer(x, {
        host: '127.0.0.1',
        port: 9000,
        path: '/peerjs'
    });
    peer.on('open', id => console.log('OPEN', id));
peer.on('error', e => console.error(e));

}

