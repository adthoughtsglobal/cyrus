class PeerHost {
  constructor(peer, opts = {}) {
    this.peer = peer
    this.clients = []
    this.token = crypto.randomUUID()
    this.handler = opts.handler || (() => { })
    peer.on('connection', c => this.#onIncoming(c))
    peer.on('error', e => this.handler('error', e))
  }

  getQRPayload() {
    return JSON.stringify({ peerId: this.peer.id, token: this.token })
  }

  sendJSON(clientId, type, payload) {
    const c = this.clients.find(x => x.clientId === clientId)
    console.log(c)
    if (!c || !c.conn.open) return
    c.conn.send(JSON.stringify({ t: type, p: payload }))
  }

  sendBinary(clientId, type, buffer) {
    const c = this.clients.find(x => x.clientId === clientId)
    if (!c || !c.conn.open) return
    const header = new TextEncoder().encode(type + '\0')
    const out = new Uint8Array(header.length + buffer.byteLength)
    out.set(header, 0)
    out.set(new Uint8Array(buffer), header.length)
    c.conn.send(out)
  }

  broadcastJSON(type, payload) {
    for (const c of this.clients) this.sendJSON(c.clientId, type, payload)
  }

  async #onIncoming(conn) {
    const { clientId, nick } = conn.metadata || {}
    if (!clientId) return conn.close()

    // bind immediately so client gets responses
    const client = {
      clientId,
      nick: nick || this.#randomNick(),
      connected_timestamp: Date.now(),
      conn,
      metadata: conn.metadata,
      approved: false
    }

    this.#bind(conn, client)

    // tell client it’s pending
    conn.send(JSON.stringify({ t: 'status', p: 'pending' }))

    if (!await justConfirm(`Approve client ${nick || clientId}?`)) {
      conn.send(JSON.stringify({ t: 'status', p: 'rejected' }))
      conn.close()
      return
    }

    client.approved = true
    this.clients.push(client)
    conn.send(JSON.stringify({ t: 'status', p: 'approved' }))
    this.handler('connect', { clientId })
  }

  #bind(conn, client) {
    conn.on('data', data => {
      console.log("data recieved")
      if (typeof data === 'string') {
        const msg = JSON.parse(data)
        this.handler('json', {
          clientId: client.clientId,
          type: msg.t,
          payload: msg.p,
          timestamp: Date.now()
        })
        return
      }

      const u8 = new Uint8Array(data)
      const sep = u8.indexOf(0)
      const type = new TextDecoder().decode(u8.slice(0, sep))
      const payload = u8.slice(sep + 1).buffer

      this.handler('binary', {
        clientId: client.clientId,
        type,
        payload,
        timestamp: Date.now()
      })
    })

    conn.on('close', () => this.#remove(client.clientId))
    conn.on('error', e => this.handler('error', { clientId: client.clientId, error: e }))
  }

  #remove(clientId) {
    const i = this.clients.findIndex(c => c.clientId === clientId)
    if (i === -1) return
    this.clients.splice(i, 1)
    this.handler('disconnect', { clientId })
  }

  #randomNick() {
    const p = ['Fox', 'Wolf', 'Raven', 'Hawk', 'Bear', 'Lynx', 'Otter', 'Crow', 'Tiger', 'Viper']
    return p[Math.floor(Math.random() * p.length)]
  }
}
