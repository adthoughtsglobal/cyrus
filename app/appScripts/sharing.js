const CHUNK = 3 * 1024 * 1024

async function additHandleClientMethods(msg) {
    if (msg.type !== 'files') return

    if (msg.payload === 'list') {
        const meta = await loadMetadata()
        window.host.sendJSON(msg.clientId, 'files', meta)
        return
    }

    const id = msg.payload.get
    if (!id) return

    const meta = await loadMetadata()
    const m = meta.find(f => f.id === id)
    if (!m) return

    const idb = await openIdb()
    const blob = await new Promise((res, rej) => {
        const tx = idb.transaction('contents', 'readonly')
        const req = tx.objectStore('contents').get(id)
        req.onsuccess = e => res(e.target.result)
        req.onerror = e => rej(e.target.error)
    })
    if (!blob) return

    window.host.sendJSON(msg.clientId, 'file:start', { id, name: m.name, size: blob.size })

    ProgressAPI.show()
    ProgressAPI.setLabel(`Sending ${m.name}...`)
    let offset = 0


    async function waitForAck(expectedOffset) {
        return new Promise(resolve => {
            function handler(event) {
                const data = event.detail
                if (data?.t === 'file:ack' && data.p?.id === id && data.p.offset >= expectedOffset) {
                    window.removeEventListener('file:ack', handler)
                    resolve()
                }
            }
            window.addEventListener('file:ack', handler)
        })
    }

    while (offset < blob.size) {
        const slice = blob.slice(offset, offset + CHUNK)
        const buf = await slice.arrayBuffer()
        window.host.sendBinary(msg.clientId, 'file', buf)

        const expectedOffset = offset + buf.byteLength
        await waitForAck(expectedOffset)

        offset = expectedOffset
        const percent = Math.min((offset / blob.size) * 100, 100)
        ProgressAPI.setProgress(percent)
    }



    ProgressAPI.setProgress(100)
    ProgressAPI.hide()
    window.host.sendJSON(msg.clientId, 'file:end', id)
}

