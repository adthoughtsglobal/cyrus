class PeerHost {
  constructor(peer, opts = {}) {
    this.peer = peer
    this.clients = []
    this.token = crypto.randomUUID()
    this.handler = opts.handler || (() => {})
    this.reconnectAttempts = new Map()

    peer.on('connection', c => this.#onIncoming(c))
    peer.on('error', e => this.handler('error', e))
  }

  getQRPayload() {
    return JSON.stringify({ peerId: this.peer.id, token: this.token })
  }

  kickbyid(clientId) {
    const i = this.clients.findIndex(c => c.clientId === clientId)
    if (i === -1) return
    this.clients[i].conn?.close()
    this.clients.splice(i, 1)
    this.handler('disconnect', { clientId })
  }

  changenick(clientId, nick) {
    const c = this.clients.find(x => x.clientId === clientId)
    if (!c) return
    c.nick = nick
    this.handler('nickchange', { clientId, nick })
  }

  async #onIncoming(conn) {
    const { clientId, nick } = conn.metadata || {}
    if (!clientId) {
      conn.close()
      return
    }

    let client = this.clients.find(c => c.clientId === clientId)

    if (client) {
      client.conn?.close()
      client.conn = conn
      client.connected_timestamp = Date.now()
      this.#bind(conn, client)
      this.handler('reconnect', { clientId })
      return
    }

    if (!await confirm(`Approve client ${nick || clientId}?`)) {
      conn.close()
      return
    }

    client = {
      clientId,
      nick: nick || this.#randomNick(),
      connected_timestamp: Date.now(),
      conn,
      metadata: conn.metadata
    }

    this.clients.push(client)
    this.#bind(conn, client)
    this.handler('connect', { clientId })
  }

  #bind(conn, client) {
    conn.on('data', data => {
      this.handler('data', {
        clientId: client.clientId,
        data,
        timestamp: Date.now(),
        metadata: client.metadata
      })
    })

    conn.on('close', () => {
      this.#remove(client.clientId)
    })

    conn.on('error', e => {
      this.handler('error', { clientId: client.clientId, error: e })
    })
  }

  #remove(clientId) {
    const i = this.clients.findIndex(c => c.clientId === clientId)
    if (i === -1) return
    this.clients.splice(i, 1)
    this.handler('disconnect', { clientId })
  }

  #randomNick() {
    const pool = [
      'Fox','Wolf','Raven','Hawk','Bear',
      'Lynx','Otter','Crow','Tiger','Viper'
    ]
    return pool[Math.floor(Math.random() * pool.length)]
  }
}
