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

const confirmPane = document.getElementById("confirmElement")
const allowBtn = confirmPane.querySelector(".btn:not(.red)")
const cancelBtn = confirmPane.querySelector(".btn.red")

window.confirm = msg => new Promise(r => {
    confirmPane.querySelector("span").textContent = msg
    confirmPane.classList.add("show")
    const done = v => {
        confirmPane.classList.remove("show")
        allowBtn.onclick = cancelBtn.onclick = null
        r(v)
    }
    allowBtn.onclick = () => done(true)
    cancelBtn.onclick = () => done(false)
})