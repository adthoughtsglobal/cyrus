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
    const blob = await new Promise(res => {
        const tx = idb.transaction('contents', 'readonly')
        tx.objectStore('contents').get(id).onsuccess = e => res(e.target.result)
    })
    if (!blob) return

    window.host.sendJSON(msg.clientId, 'file:start', {
        id, name: m.name, size: blob.size
    })

    let offset = 0
    while (offset < blob.size) {
        const slice = blob.slice(offset, offset + CHUNK)
        const buf = await slice.arrayBuffer()
        window.host.sendBinary(msg.clientId, 'file', buf)
        offset += CHUNK
    }

    window.host.sendJSON(msg.clientId, 'file:end', id)
}
