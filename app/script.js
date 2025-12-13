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
})
setTimeout(() => {
    moveHL(document.querySelector(".btn.active"));

    const tooltip = document.createElement("div")
    tooltip.style.position = "fixed"
    tooltip.style.padding = "4px 8px"
    tooltip.style.background = "#222"
    tooltip.style.color = "#fff"
    tooltip.style.fontSize = "12px"
    tooltip.style.borderRadius = "4px"
    tooltip.style.pointerEvents = "none"
    tooltip.style.opacity = "0"
    tooltip.style.zIndex = "10"
    tooltip.style.transition = "opacity .1s"
    document.body.appendChild(tooltip)

    document.querySelectorAll("[tooltip]").forEach(el => {
        el.addEventListener("mouseenter", e => {
            tooltip.textContent = el.getAttribute("tooltip")
            tooltip.style.opacity = "1"
        })

        el.addEventListener("mousemove", e => {
            tooltip.style.left = e.clientX + 10 + "px"
            tooltip.style.top = e.clientY + 10 + "px"
        })

        el.addEventListener("mouseleave", () => {
            tooltip.style.opacity = "0"
        })
    })
}, 500);

const peer = new Peer()

peer.on('open', id => {
    const host = new PeerHost(peer, {
        handler: (event, payload) => {
            if (event === 'connect') {
                console.log('connected', payload)
            }
            if (event === 'disconnect') {
                console.log('disconnected', payload.id)
            }
            if (event === 'data') {
                console.log(payload.id, payload.data)
            }
            if (event === 'error') {
                console.error(payload)
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


    window.host = host
})

let addicn = document.getElementById("new_cl_addbtn");
let addbtnitself = document.getElementById("new_cl_btn");
let newClInstrPan = document.getElementById("newClInstrPan");
addbtnitself.addEventListener("click", () => {
    addbtnitself.classList.toggle("onit")
    addicn.classList.toggle("rotatediag");
    newClInstrPan.classList.toggle("visibility")
})