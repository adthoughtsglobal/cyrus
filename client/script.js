const statusEl = document.getElementById('status')
const logEl = document.getElementById('log')
const filesEl = document.getElementById('files')
const hostJsonEl = document.getElementById('hostJson')

const status = s => statusEl.textContent = s
const log = (...a) => {
    logEl.textContent += a.join(' ') + '\n'
    logEl.scrollTop = logEl.scrollHeight
}

let conn
let clientId = localStorage.getItem('client_id') || crypto.randomUUID()
localStorage.setItem('client_id', clientId)

const savedHost = localStorage.getItem('host_json')
if (savedHost) hostJsonEl.value = savedHost

const incomingFiles = {}

document.getElementById('saveHost').onclick = () => {
    let parsed
    try { parsed = JSON.parse(hostJsonEl.value) }
    catch { return alert('Invalid JSON') }

    if (!parsed.peerId) return alert('Missing peerId')

    localStorage.setItem('host_json', hostJsonEl.value)
    connect(parsed.peerId)
}

function connect(hostPeerId) {
    startPeer(clientId);
    peer.on('open', () => {
        conn = peer.connect(hostPeerId, {
            metadata: { clientId, nick: 'Client' }
        })
        bindConnection()
    })
}

function bindConnection() {
    conn.on('open', () => {
        status('connected')
        log('Connected to host')
    })

    let approved = false

    conn.on('data', data => {
        if (typeof data === 'string') {
            const msg = JSON.parse(data)

            if (msg.t === 'status') {
                if (msg.p === 'approved') {
                    approved = true
                    status('connected')
                    conn.send(JSON.stringify({ t: 'files', p: 'list' }))
                } else if (msg.p === 'pending') {
                    status('waiting')
                } else {
                    status('rejected')
                    conn.close()
                }
                return
            }

            if (!approved) return

            if (msg.t === 'files') renderFiles(msg.p)

            if (msg.t === 'file:start') {
                incomingFiles[msg.p.id] = { meta: msg.p, chunks: [], received: 0 }
            }

            if (msg.t === 'file:end') {
                const f = incomingFiles[msg.p]
                if (!f) return
                downloadBlob(new Blob(f.chunks), f.meta.name)
                delete incomingFiles[msg.p]
                activeDownload = null
                requestNext()
            }

        } else {
            const u8 = new Uint8Array(data)
            const sep = u8.indexOf(0)
            if (sep === -1) return
            const type = new TextDecoder().decode(u8.slice(0, sep))
            const payload = u8.slice(sep + 1).buffer
            if (type !== 'file') return
            const f = Object.values(incomingFiles)[0]
            if (!f) return
            f.chunks.push(payload)
            f.received += payload.byteLength
            conn.send(JSON.stringify({
                t: 'file:ack',
                p: { id: f.meta.id, offset: f.received }
            }))
        }
    })

    conn.on('close', () => status('disconnected'))
    conn.on('error', e => log(e))
}


const filesTable = document.querySelector('#files_table')
const filesTableHeader = filesTable.innerHTML

function formatBytes(b) {
    if (b === 0) return '0 B'
    const k = 1024
    const s = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(2) + ' ' + s[i]
}

async function renderFiles(list) {
    function getSelectedIds() {
        return Array.from(filesTable.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value)
    }

    filesTable.innerHTML = filesTableHeader

    if (!list.length) {
        filesTable.innerHTML += '<tr><td colspan="5">No Files</td></tr>'
        return
    }

    list.forEach(f => {
        const tr = document.createElement('tr')

        const tdSelect = document.createElement('td')
        const chk = document.createElement('input')
        chk.type = 'checkbox'
        chk.value = f.id
        chk.addEventListener('change', () => renderActionButtons(getSelectedIds()))
        tdSelect.appendChild(chk)

        const tdName = document.createElement('td')
        tdName.textContent = f.name
        tdName.onclick = () => conn.send(JSON.stringify({ t: 'files', p: { get: f.id } }))

        const tdModified = document.createElement('td')
        tdModified.textContent = new Date(f.modified).toLocaleString()

        const tdSize = document.createElement('td')
        tdSize.textContent = formatBytes(f.size)

        const tdId = document.createElement('td')
        tdId.textContent = f.id

        tr.append(tdSelect, tdName, tdModified, tdSize, tdId)
        filesTable.appendChild(tr)
    })

    const selectAllCheckbox = document.getElementById('selectAll')

    selectAllCheckbox.addEventListener('change', () => {
        const allCheckboxes = filesTable.querySelectorAll('input[type="checkbox"]:not(#selectAll)')
        allCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked)
        renderActionButtons(getSelectedIds())
    })

    filesTable.addEventListener('change', e => {
        if (e.target.type === 'checkbox' && e.target.id !== 'selectAll') {
            const allCheckboxes = filesTable.querySelectorAll('input[type="checkbox"]:not(#selectAll)')
            selectAllCheckbox.checked = Array.from(allCheckboxes).every(cb => cb.checked)
        }
    })
}


function downloadBlob(blob, name) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
}

function renderActionButtons(selectedIds) {
    const container = document.getElementById('fileActionBtns');
    container.innerHTML = '';
    if (!selectedIds.length) return;

    const actions = [
        { name: 'Download', icon: 'download', onClick: () => downloadFiles(selectedIds) }
    ];

    actions.forEach(a => {
        const btn = document.createElement('div');
        btn.className = 'btn';
        btn.innerHTML = `<div class="icn">${a.icon}</div><div class="title">${a.name}</div>`;
        btn.onclick = a.onClick;
        container.appendChild(btn);
    });
}

let downloadQueue = []
let activeDownload = null

function downloadFiles(ids) {
    downloadQueue.push(...ids)
    if (!activeDownload) requestNext()
}

function requestNext() {
    if (!downloadQueue.length) {
        activeDownload = null
        return
    }
    console.log(67, activeDownload)
    activeDownload = downloadQueue.shift()
    conn.send(JSON.stringify({ t: 'files', p: { get: activeDownload } }))
}
