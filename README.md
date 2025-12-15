# Cyrus
Cyrus is a dashboard for locally hosting centralized storage and coordinating Peer-to-Peer data transfers.

## Prerequisites
- Git
- Node.js
- npm

```sh
git clone https://github.com/adthoughtsglobal/alphashore-Cyrus.git
cd cyrus
npm install
```

## Setup signaling server
Cyrus uses PeerJS as a WebRTC signaling server.
1. Install PeerJS globally:
 ```sh
npm i -g peer
```
1. Start local signaling server: by default Cyrus uses port 9000, you can change this behaviour in the source code at `scripts/peerConfig.js`. 
 ```sh
peerjs --port 9000 --key peerjs
```
You have to keep it running.
## Host the dashboard
If you have already hosted the signaling server, hosting a dashboard is one step away. If you haven't, you can use the version of the dashboard hosted at github pages.
1. Host the dashboard
 ```sh
npx serve .
```
1. Your dashboard would be running at **http://localhost:3000/app/**.