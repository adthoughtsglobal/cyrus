class Cyrus {
    constructor(hooks = {}) {
        this.peer = null
        this.conn = null
        this.hooks = hooks
        this.incomingFiles = {}
        this.downloadQueue = []
        this.activeDownload = null
        this.approved = false
        this.filesCache = []

        this.file = {
            ls: () => new Promise(r => {
                this._onFiles = r
                this.send({ t: 'files', p: 'list' })
            }),
            get: id => this.send({ t: 'files', p: { get: id } }),
            queue: ids => {
                this.downloadQueue.push(...ids)
                if (!this.activeDownload) this.file.next()
            },
            next: () => {
                if (!this.downloadQueue.length) {
                    this.activeDownload = null
                    return
                }
                this.activeDownload = this.downloadQueue.shift()
                this.file.get(this.activeDownload)
            }
        }
    }

    connect(hostPeerId, clientId) {
        this.peer = new Peer(clientId, {
            host: '127.0.0.1',
            port: 9000,
            path: '/'
        })

        this.peer.on('open', () => {
            this.conn = this.peer.connect(hostPeerId, {
                metadata: { clientId, nick: 'Client' }
            })
            this.bind()
            this.hooks.open?.()
        })
    }

    send(o) {
        this.conn.send(JSON.stringify(o))
    }

    bind() {
        this.conn.on('open', () => this.hooks.connOpen?.())
        this.conn.on('close', () => this.hooks.connClose?.())
        this.conn.on('error', e => this.hooks.error?.(e))

        this.conn.on('data', data => {
            if (typeof data === 'string') {
                const msg = JSON.parse(data)

                if (msg.t === 'status') {
                    if (msg.p === 'approved') {
                        this.approved = true
                        this.send({ t: 'files', p: 'list' })
                    }
                    this.hooks.status?.(msg.p)
                    return
                }

                if (msg.t === 'files') {
                    this.filesCache = msg.p
                    this._onFiles?.(msg.p)
                    this._onFiles = null
                    this.hooks.files?.(msg.p)
                    return
                }

                if (!this.approved) return

                if (msg.t === 'file:start') {
                    this.incomingFiles[msg.p.id] = { meta: msg.p, chunks: [], received: 0 }
                    this.hooks.fileStart?.(msg.p)
                    return
                }

                if (msg.t === 'file:end') {
                    const f = this.incomingFiles[msg.p]
                    if (!f) return
                    const blob = new Blob(f.chunks)
                    delete this.incomingFiles[msg.p]
                    this.activeDownload = null
                    this.hooks.fileEnd?.(f.meta, blob)
                    this.file.next()
                    return
                }

                this.hooks.message?.(msg)
            } else {
                const u8 = new Uint8Array(data)
                const sep = u8.indexOf(0)
                if (sep === -1) return
                const type = new TextDecoder().decode(u8.slice(0, sep))
                if (type !== 'file') return
                const payload = u8.slice(sep + 1).buffer
                const f = Object.values(this.incomingFiles)[0]
                if (!f) return
                f.chunks.push(payload)
                f.received += payload.byteLength
                this.send({ t: 'file:ack', p: { id: f.meta.id, offset: f.received } })
                this.hooks.fileChunk?.(f.meta, f.received)
            }
        })
    }
}
