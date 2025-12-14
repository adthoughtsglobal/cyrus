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

const peer = new Peer(peerId);
let host;

peer.on('open', id => {
    host = new PeerHost(peer, {
        handler: (event, payload) => {
            if (event === 'connect') renderClientsList()
            if (event === 'disconnect') renderClientsList()
            if (event === 'nickchange') renderClientsList()

            if (event === 'json') {
                const { clientId, type, payload: data } = payload
                additHandleClientMethods(payload);

                if (type === 'chat') {
                    host.broadcastJSON('chat', {
                        from: clientId,
                        text: data
                    })
                }
            }

            if (event === 'binary') {
                const { clientId, type, payload: buf } = payload
                console.log('[bin]', clientId, type, buf.byteLength)
            }

            if (event === 'error') console.error(payload)
        }
    })

    const qrPayload = host.getQRPayload()
    document.getElementById('manual_token_input').value = qrPayload

    new QRCode(document.getElementById('qrScannable'), {
        text: qrPayload,
        width: 128,
        height: 128
    })

    window.host = host
    renderClientsList()
})

window.sendToClient = (clientId, text) => {
    host.sendJSON(clientId, 'chat', text)
}

window.sendBinaryToClient = (clientId, buffer) => {
    host.sendBinary(clientId, 'blob', buffer)
}

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
function generateId() {
    return crypto.getRandomValues(new Uint32Array(4)).join('-');
}

async function openIdb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open('file_store', 1);
        r.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
            if (!db.objectStoreNames.contains('contents')) db.createObjectStore('contents');
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}

async function saveFileContent(id, blob) {
    const idb = await openIdb();
    return new Promise((res, rej) => {
        const tx = idb.transaction('contents', 'readwrite');
        const req = tx.objectStore('contents').put(blob, id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

async function getFileContent(id) {
    const idb = await openIdb();
    return new Promise((res, rej) => {
        const tx = idb.transaction('contents', 'readonly');
        const req = tx.objectStore('contents').get(id);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
    });
}

async function loadMetadata() {
    const idb = await openIdb();
    return new Promise(res => {
        const tx = idb.transaction('meta', 'readonly');
        const req = tx.objectStore('meta').get('files_meta');
        req.onsuccess = () => res(req.result || []);
    });
}

async function saveMetadata(meta) {
    const idb = await openIdb();
    const tx = idb.transaction('meta', 'readwrite');
    tx.objectStore('meta').put(meta, 'files_meta');
}

async function deleteFile(ids) {
    const meta = await loadMetadata();
    const remaining = meta.filter(f => !ids.includes(f.id));
    await saveMetadata(remaining);

    const idb = await openIdb();
    const tx = idb.transaction('contents', 'readwrite');
    ids.forEach(id => tx.objectStore('contents').delete(id));
    toast(ids.length + " files deleted");
    renderFilesList();
}
async function downloadFiles(ids) {
    const idb = await openIdb();
    const meta = await loadMetadata();
    const canStreamToDisk = 'showSaveFilePicker' in window;

    for (const id of ids) {
        const blob = await new Promise((res, rej) => {
            const tx = idb.transaction('contents', 'readonly');
            const req = tx.objectStore('contents').get(id);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        if (!blob) continue;

        const m = meta.find(f => f.id === id);
        const name = m?.name || 'file';

        if (canStreamToDisk) {
            const handle = await showSaveFilePicker({ suggestedName: name });
            const writable = await handle.createWritable();
            await blob.stream().pipeTo(writable);
        } else {
            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
        }
    }

    toast("Files downloaded");
}

function renderActionButtons(selectedIds) {
    const container = document.getElementById('fileActionBtns');
    container.innerHTML = '';
    if (!selectedIds.length) return;

    const actions = [
        { name: 'Download', icon: 'download', onClick: () => downloadFiles(selectedIds) },
        { name: 'Delete', icon: 'delete', onClick: () => deleteFile(selectedIds) },
        { name: 'Rename', icon: 'edit', onClick: () => enableInlineRename(selectedIds) }
    ];

    actions.forEach(a => {
        const btn = document.createElement('div');
        btn.className = 'btn';
        btn.innerHTML = `<div class="icn">${a.icon}</div><div class="title">${a.name}</div>`;
        btn.onclick = a.onClick;
        container.appendChild(btn);
    });
}


function enableInlineRename(selectedIds) {
    const renameNext = async index => {
        if (index >= selectedIds.length) return;
        const id = selectedIds[index];
        const tr = Array.from(filesTable.querySelectorAll('tr')).find(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            return checkbox && checkbox.value == id;
        });
        if (!tr) return renameNext(index + 1);

        const nameTd = tr.children[1];
        nameTd.contentEditable = 'true';
        nameTd.focus();

        const onBlur = async () => {
            const meta = await loadMetadata();
            const fileMeta = meta.find(f => f.id == id);
            if (fileMeta) {
                fileMeta.name = nameTd.textContent.trim();
                toast("File renamed");
                await saveMetadata(meta);
            }
            nameTd.contentEditable = 'false';
            renameNext(index + 1);
        };

        nameTd.addEventListener('blur', onBlur, { once: true });
    };
    renameNext(0);
}
async function renderFilesList() {
    async function updateTotalMemory() {
        const meta = await loadMetadata();
        const total = meta.reduce((sum, f) => sum + f.size, 0);
        document.getElementById('total_mem_used').textContent = formatBytes(total);
    }
    function getSelectedIds() {
        return Array.from(filesTable.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
    }

    updateTotalMemory();
    const meta = await loadMetadata();
    filesTable.innerHTML = filesTableHeader;

    if (!meta.length) {
        filesTable.innerHTML += '<tr><td colspan="5">No Files</td></tr>';
        return;
    }

    meta.forEach(f => {
        const tr = document.createElement('tr');

        const tdSelect = document.createElement('td');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = f.id;
        chk.addEventListener('change', () => renderActionButtons(getSelectedIds()));
        tdSelect.appendChild(chk);

        const tdName = document.createElement('td');
        tdName.textContent = f.name;

        const tdModified = document.createElement('td');
        tdModified.textContent = new Date(f.modified).toLocaleString();

        const tdSize = document.createElement('td');
        tdSize.textContent = formatBytes(f.size);

        const tdId = document.createElement('td');
        tdId.textContent = f.id;

        tr.append(tdSelect, tdName, tdModified, tdSize, tdId);
        filesTable.appendChild(tr);
    });
    const selectAllCheckbox = document.getElementById('selectAll');

    selectAllCheckbox.addEventListener('change', () => {
        const allCheckboxes = filesTable.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
        allCheckboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        const selectedIds = Array.from(allCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        renderActionButtons(selectedIds);
    });

    filesTable.addEventListener('change', e => {
        if (e.target.type === 'checkbox' && e.target.id !== 'selectAll') {
            const allCheckboxes = filesTable.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
            selectAllCheckbox.checked = Array.from(allCheckboxes).every(cb => cb.checked);
        }
    });
}

async function handleFileInput(files) {
    const meta = await loadMetadata();

    for (const f of files) {
        const id = generateId();
        meta.push({ id, name: f.name, modified: f.lastModified, size: f.size });
        await saveFileContent(id, f);
    }

    await saveMetadata(meta);
    renderFilesList();
}


document.getElementById('new_fl_btn').onclick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => handleFileInput(input.files)
    input.click()
}

renderFilesList()

const toastQueue = [];
let showing = false;

function toast(text) {
    const container = document.getElementById('toast-container');
    const toastDiv = document.createElement('div');
    toastDiv.textContent = text;
    toastDiv.style.cssText = `
        background: #333; color: #fff; padding: 0.8em 1.2em; border-radius: 0.4em;
        opacity: 0; transform: translateY(20px); transition: opacity 0.3s, transform 0.3s;
        pointer-events: auto; cursor: pointer; position: relative;
    `;
    toastDiv.onclick = () => {
        container.removeChild(toastDiv);
        showNextToast();
    };
    toastQueue.push(toastDiv);
    if (!showing) showNextToast();
}

function showNextToast() {
    const container = document.getElementById('toast-container');
    if (toastQueue.length === 0) {
        showing = false;
        return;
    }
    showing = true;
    const toastDiv = toastQueue.shift();
    container.appendChild(toastDiv);

    const offset = container.children.length - 1;
    toastDiv.style.opacity = '1';
    toastDiv.style.transform = 'translateY(0)';
    toastDiv.style.zIndex = offset;

    for (let i = 0; i < offset; i++) {
        container.children[i].style.opacity = '0.6';
    }

    setTimeout(() => {
        if (container.contains(toastDiv)) container.removeChild(toastDiv);
        showNextToast();
    }, 3000);
}