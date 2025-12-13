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

    document.addEventListener("mouseover", e => {
        const el = e.target.closest("[tooltip]")
        if (!el) return
        tooltip.textContent = el.getAttribute("tooltip")
        tooltip.style.opacity = "1"
    })

    document.addEventListener("mousemove", e => {
        if (tooltip.style.opacity === "0") return
        tooltip.style.left = e.clientX + 10 + "px"
        tooltip.style.top = e.clientY + 10 + "px"
    })

    document.addEventListener("mouseout", e => {
        if (e.target.closest("[tooltip]")) {
            tooltip.style.opacity = "0"
        }
    })
}

setTimeout(() => {
    moveHL(document.querySelector(".btn.active"));
    assignToolTips();
}, 500);

const peer = new Peer()

peer.on('open', id => {
    const host = new PeerHost(peer, {
        handler: (event, payload) => {
            if (event === 'connect') {
                console.log('connected', payload)
                renderClientsList();
            }
            if (event === 'disconnect') {
                console.log('disconnected', payload.id)
                renderClientsList();
            }
            if (event === 'data') {
                console.log(payload.id, payload.data)
            }
            if (event === 'error') {
                console.error(payload)
            }
            if (event === "nickchange") {
                renderClientsList();
            }
        }
    })

    let qrCodeElement = document.getElementById("qrScannable")
    const payload = host.getQRPayload()

    document.getElementById("manual_token_input").value = payload;
    new QRCode(qrCodeElement, {
        text: payload,
        width: 128,
        height: 128
    })
    window.host = host;
    renderClientsList();

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
    if (window.host.clients.length < 1) {
        tbody.innerHTML = 'No Clients';
        newClInstrPan.classList.remove("visibility")
        return;
    }
    tbody.innerHTML = tbodyheaders;
    window.host.clients.forEach(c => {
        const tr = document.createElement('tr')

        const tdId = document.createElement('td')
        tdId.textContent = c.id

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
        kick.onclick = () => host.kickbyid(c.id)

        const reconnect = document.createElement('div')
        reconnect.className = 'icn btn'
        reconnect.setAttribute('tooltip', 'Reconnect')
        reconnect.textContent = 'refresh'
        reconnect.onclick = () => {
        reconnect.textContent = 'rotate_right'
            host.reconnectbyid(c.id).then(renderClientsList())
        }

        const nick = document.createElement('div')
        nick.className = 'icn btn'
        nick.setAttribute('tooltip', 'Change Nickname')
        nick.textContent = 'badge'
        nick.onclick = () => {
            const n = prompt('New nick')
            if (n) host.changenick(c.id, n)
        }

        grp.append(kick, reconnect, nick)
        tdActions.appendChild(grp)

        tr.append(tdId, tdNick, tdStatus, tdActions)
        tbody.appendChild(tr)
    });
}
