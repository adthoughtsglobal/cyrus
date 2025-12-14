const nav = document.querySelector(".pages_nav")
const hl = nav.querySelector(".nav_hl")

function moveHL(el) {
    const r1 = nav.getBoundingClientRect()
    const r2 = el.getBoundingClientRect()
    hl.style.width = r2.width + "px"
    hl.style.height = r2.height + "px"
    hl.style.transform = `translate(${r2.left - r1.left}px, ${r2.top - r1.top}px)`
}

document.querySelectorAll("[clickTgt]").forEach(x => {
    x.addEventListener("click", () => {
        document.querySelectorAll(".active").forEach(z => z.classList.remove("active"))
        document.getElementById(x.getAttribute("clickTgt"))?.classList.add("active")
        x.classList.add("active")
        moveHL(x)
    })
});
function assignToolTips() {
    const tooltip = document.createElement("div")
    Object.assign(tooltip.style, {
        position: "fixed",
        padding: "4px 8px",
        background: "#222",
        color: "#fff",
        fontSize: "12px",
        borderRadius: "4px",
        pointerEvents: "none",
        opacity: "0",
        zIndex: "10",
        transition: "opacity .1s"
    })
    document.body.appendChild(tooltip)

    let activeEl = null

    document.addEventListener("mouseover", e => {
        const el = e.target.closest("[tooltip]")
        if (!el) return
        activeEl = el
        tooltip.textContent = el.getAttribute("tooltip")
        tooltip.style.opacity = "1"
    })

    document.addEventListener("mousemove", e => {
        if (!activeEl) return
        if (!activeEl.isConnected) {
            activeEl = null
            tooltip.style.opacity = "0"
            return
        }
        tooltip.style.left = e.clientX + 10 + "px"
        tooltip.style.top = e.clientY + 10 + "px"
    })

    document.addEventListener("mouseout", e => {
        if (activeEl && e.target.closest("[tooltip]") === activeEl) {
            activeEl = null
            tooltip.style.opacity = "0"
        }
    })
}


setTimeout(() => {
    moveHL(document.querySelector(".btn.active"));
    assignToolTips();
}, 500);

const STORAGE_KEY = 'peer_id'

let peerId = localStorage.getItem(STORAGE_KEY)
if (!peerId) {
    peerId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, peerId)
}

const peer = new Peer(peerId)

peer.on('open', id => {
    const host = new PeerHost(peer, {
        handler: (event, payload) => {
            if (event === 'connect') renderClientsList()
            if (event === 'disconnect') renderClientsList()
            if (event === 'data') console.log(payload.id, payload.data)
            if (event === 'error') console.error(payload)
            if (event === 'nickchange') renderClientsList()
        }
    })

    const payload = host.getQRPayload()
    document.getElementById("manual_token_input").value = payload

    new QRCode(document.getElementById("qrScannable"), {
        text: payload,
        width: 128,
        height: 128
    })

    window.host = host
    renderClientsList()
})


let addicn = document.getElementById("new_cl_addbtn");
let addbtnitself = document.getElementById("new_cl_btn");
let newClInstrPan = document.getElementById("newClInstrPan");
addbtnitself.addEventListener("click", () => {
    addbtnitself.classList.toggle("onit")
    addicn.classList.toggle("rotatediag");
    newClInstrPan.classList.toggle("visibility")
})
const tbody = document.querySelector('#connections_table')
let tbodyheaders = tbody.innerHTML;
function renderClientsList() {

    document.getElementById("connected_number").innerText = host.clients.length;
    if (window.host.clients.length < 1) {
        tbody.innerHTML = 'No Clients';
        newClInstrPan.classList.remove("visibility")
        return;
    }
    tbody.innerHTML = tbodyheaders;
    window.host.clients.forEach(c => {
        const tr = document.createElement('tr')

        const tdId = document.createElement('td')
        tdId.textContent = c.clientId

        const tdNick = document.createElement('td')
        tdNick.textContent = c.nick

        const tdStatus = document.createElement('td')
        tdStatus.textContent = 'Connected'

        const tdActions = document.createElement('td')
        const grp = document.createElement('div')
        grp.className = 'icnbtngrp'

        const kick = document.createElement('div')
        kick.className = 'icn btn'
        kick.setAttribute('tooltip', 'Kick')
        kick.textContent = 'sports_martial_arts'
        kick.onclick = () => host.kickbyid(c.clientId)

        const reconnect = document.createElement('div')
        reconnect.className = 'icn btn'
        reconnect.setAttribute('tooltip', 'Reconnect')
        reconnect.textContent = 'refresh'
        reconnect.onclick = () => {
            reconnect.textContent = 'rotate_right'
            host.reconnectbyid(c.clientId).then(renderClientsList())
        }

        const nick = document.createElement('div')
        nick.className = 'icn btn'
        nick.setAttribute('tooltip', 'Change Nickname')
        nick.textContent = 'badge'
        nick.onclick = () => {
            const n = prompt('New nick')
            if (n) host.changenick(c.clientId, n)
        }

        grp.append(kick, reconnect, nick)
        tdActions.appendChild(grp)

        tr.append(tdId, tdNick, tdStatus, tdActions)
        tbody.appendChild(tr)
    });
}

const justConfirmPane = document.getElementById("confirmElement")
const allowBtn = justConfirmPane.querySelector(".btn:not(.red)")
const cancelBtn = justConfirmPane.querySelector(".btn.red")

window.justConfirm = msg => new Promise(r => {
    justConfirmPane.querySelector("span").textContent = msg
    justConfirmPane.classList.add("show")
    const done = v => {
        justConfirmPane.classList.remove("show")
        allowBtn.onclick = cancelBtn.onclick = null
        r(v)
    }
    allowBtn.onclick = () => done(true)
    cancelBtn.onclick = () => done(false)
})

const filesTable = document.querySelector('#files_table')
const filesTableHeader = filesTable.innerHTML

function formatBytes(b) {
    if (b === 0) return '0 B'
    const k = 1024
    const s = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(b) / Math.log(k))
    return (b / Math.pow(k, i)).toFixed(2) + ' ' + s[i]
}

async function openIdb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open('file_store', 1)
        r.onupgradeneeded = e => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
            if (!db.objectStoreNames.contains('contents')) db.createObjectStore('contents')
        }
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
    })
}

async function saveFileContent(id, blob) {
    const idb = await openIdb()
    return new Promise((res, rej) => {
        const tx = idb.transaction('contents', 'readwrite')
        const req = tx.objectStore('contents').put(blob, id)
        req.onsuccess = () => res()
        req.onerror = () => rej(req.error)
    })
}

async function getFileContent(id) {
    const idb = await openIdb()
    return new Promise((res, rej) => {
        const tx = idb.transaction('contents', 'readonly')
        const req = tx.objectStore('contents').get(id)
        req.onsuccess = () => res(req.result || null)
        req.onerror = () => rej(req.error)
    })
}


async function loadMetadata() {
    const idb = await openIdb()
    return new Promise(res => {
        const tx = idb.transaction('meta', 'readonly')
        const req = tx.objectStore('meta').get('files_meta')
        req.onsuccess = () => res(req.result || [])
    })
}

async function saveMetadata(meta) {
    const idb = await openIdb()
    const tx = idb.transaction('meta', 'readwrite')
    tx.objectStore('meta').put(meta, 'files_meta')
}

async function renderFilesList() {
    async function updateTotalMemory() {
        const meta = await loadMetadata()
        const total = meta.reduce((sum, f) => sum + f.size, 0)
        document.getElementById('total_mem_used').textContent = formatBytes(total)
    }

    updateTotalMemory()
    const meta = await loadMetadata()
    filesTable.innerHTML = filesTableHeader

    if (!meta.length) {
        filesTable.innerHTML += '<tr><td colspan="5">No Files</td></tr>'
        return
    }

    meta.forEach(f => {
        const tr = document.createElement('tr')

        const tdSelect = document.createElement('td')
        const chk = document.createElement('input')
        chk.type = 'checkbox'
        chk.value = f.id
        tdSelect.appendChild(chk)

        const tdName = document.createElement('td')
        tdName.textContent = f.name

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
async function handleFileInput(files) {
    const meta = await loadMetadata()
    let nextId = meta.length ? Math.max(...meta.map(f => f.id)) + 1 : 1

    for (const f of files) {
        const id = nextId++
        meta.push({ id, name: f.name, modified: f.lastModified, size: f.size })
        await saveFileContent(id, f)
    }

    await saveMetadata(meta)
    renderFilesList()
}


document.getElementById('new_fl_btn').onclick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => handleFileInput(input.files)
    input.click()
}

renderFilesList()