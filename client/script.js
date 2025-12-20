const statusEl = document.getElementById('status')
const logEl = document.getElementById('log')
const hostJsonEl = document.getElementById('hostJson')
const filesTable = document.querySelector('#files_table')
const filesTableHeader = filesTable.innerHTML

const status = s => statusEl.textContent = s
const log = (...a) => {
    logEl.textContent += a.join(' ') + '\n'
    logEl.scrollTop = logEl.scrollHeight
}

const clientId = localStorage.getItem('client_id') || crypto.randomUUID()
localStorage.setItem('client_id', clientId)

const savedHost = localStorage.getItem('host_json')
if (savedHost) hostJsonEl.value = savedHost

const cyrus = new Cyrus(peer, {
    connOpen: () => {
        status('connected')
        log('Connected to host')
    },
    connClose: () => status('disconnected'),
    status: s => {
        if (s === 'approved') status('connected')
        if (s === 'pending') status('waiting')
        if (s === 'rejected') status('rejected')
    },
    files: list => renderFiles(list),
    fileEnd: (meta, blob) => downloadBlob(blob, meta.name),
    error: e => log(e)
})

document.getElementById('saveHost').onclick = () => {
    let parsed
    try { parsed = JSON.parse(hostJsonEl.value) } catch { return alert('Invalid JSON') }
    if (!parsed.peerId) return alert('Missing peerId')
    localStorage.setItem('host_json', hostJsonEl.value)
    cyrus.connect(parsed.peerId, clientId)
}

function formatBytes(b) {
    if (b === 0) return '0 B'
    const k = 1024
    const s = ['B','KB','MB','GB','TB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(2) + ' ' + s[i]
}

function renderFiles(list) {
    const getSelectedIds = () =>
        Array.from(filesTable.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value)

    filesTable.innerHTML = filesTableHeader
    if (!list.length) {
        filesTable.innerHTML += '<tr><td colspan="5">No Files</td></tr>'
        return
    }

    list.forEach(f => {
        const tr = document.createElement('tr')

        const chk = document.createElement('input')
        chk.type = 'checkbox'
        chk.value = f.id
        chk.onchange = () => renderActionButtons(getSelectedIds())

        const tdSelect = document.createElement('td')
        tdSelect.appendChild(chk)

        const tdName = document.createElement('td')
        tdName.textContent = f.name
        tdName.onclick = () => cyrus.file.get(f.id)

        const tdModified = document.createElement('td')
        tdModified.textContent = new Date(f.modified).toLocaleString()

        const tdSize = document.createElement('td')
        tdSize.textContent = formatBytes(f.size)

        const tdId = document.createElement('td')
        tdId.textContent = f.id

        tr.append(tdSelect, tdName, tdModified, tdSize, tdId)
        filesTable.appendChild(tr)
    })
}

function downloadBlob(blob, name) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
}

function renderActionButtons(ids) {
    const container = document.getElementById('fileActionBtns')
    container.innerHTML = ''
    if (!ids.length) return

    const btn = document.createElement('div')
    btn.className = 'btn'
    btn.innerHTML = `<div class="icn">download</div><div class="title">Download</div>`
    btn.onclick = () => cyrus.file.queue(ids)
    container.appendChild(btn)
}
