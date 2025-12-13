class PeerHost {
  constructor(peer, opts = {}) {
    this.peer = peer
    this.clients = []
    this.token = crypto.randomUUID()
    this.handler = opts.handler || (()=>{})
    this.reconnectAttempts = new Map()

    peer.on('connection', c => this.#onIncoming(c))
    peer.on('error', e => this.handler('error', e))
  }

  getQRPayload() {
    return JSON.stringify({ peerId: this.peer.id, token: this.token })
  }

  kickbyid(id) {
    const i = this.clients.findIndex(c => c.id === id)
    if (i === -1) return
    const c = this.clients[i]
    c.conn?.close()
    this.clients.splice(i, 1)
    this.handler('kicked', { id })
    this.handler('disconnect', { id })
  }

  reconnectbyid(id) {
    const c = this.clients.find(x => x.id === id)
    if (!c) return
    const tries = (this.reconnectAttempts.get(id) || 0) + 1
    if (tries > 1) {
      this.#remove(id)
      return
    }
    this.reconnectAttempts.set(id, tries)
    const conn = this.peer.connect(id)
    this.#bind(conn, c)
    this.handler('reconnect', { id })
  }

  changenick(id, nick) {
    const c = this.clients.find(x => x.id === id)
    if (!c) return
    c.nick = nick
    this.handler('nickchange', { id, nick })
  }

  #onIncoming(conn) {
    if (this.clients.some(c => c.id === conn.peer)) {
      conn.close()
      return
    }

    if (!confirm(`Approve client ${conn.peer}?`)) {
      conn.close()
      return
    }

    const client = {
      id: conn.peer,
      nick: this.#randomNick(),
      connected_timestamp: Date.now(),
      conn,
      metadata: {}
    }

    this.clients.push(client)
    this.#bind(conn, client)
    this.handler('connect', client)
  }

  #bind(conn, client) {
    conn.on('data', data => {
      this.handler('data', {
        id: client.id,
        data,
        timestamp: Date.now(),
        metadata: client.metadata
      })
    })

    conn.on('close', () => {
      this.#remove(client.id)
    })

    conn.on('error', e => {
      this.handler('error', { id: client.id, error: e })
    })
  }

  #remove(id) {
    const i = this.clients.findIndex(c => c.id === id)
    if (i === -1) return
    this.clients.splice(i, 1)
    this.handler('disconnect', { id })
  }

  #randomNick() {
    const pool = [
      'Fox','Wolf','Raven','Hawk','Bear',
      'Lynx','Otter','Crow','Tiger','Viper'
    ]
    return pool[Math.floor(Math.random()*pool.length)]
  }
}
