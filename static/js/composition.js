function showMode() {
    let mode = document.getElementById("modeSelect").value
    document.getElementById("singleMode").style.display = "none"
    document.getElementById("eqMode").style.display = "none"

    if (mode === "single") {
        document.getElementById("singleMode").style.display = "block"
    }
    if (mode === "equation") {
        document.getElementById("eqMode").style.display = "block"
    }
}

document.getElementById("modeSelect").addEventListener("change", showMode)

function calcSingle() {
    let comp = document.getElementById("singleInput").value.trim()

    if (!comp) {
        document.getElementById("singleResult").innerHTML = "Enter a compound!"
        return
    }

    let data = new FormData()
    data.append("compound", comp)

    fetch("/composition/single", { method:"POST", body:data })
    .then(r => r.json())
    .then(d => {
        if (!Object.keys(d).length) {
            document.getElementById("singleResult").innerHTML = "Invalid compound"
            return
        }

        // Pretty formatting
        let out = "<b>Percentage Composition:</b><br><br>"
        for (let e in d) {
            out += `${e}: ${d[e]}%<br>`
        }

        document.getElementById("singleResult").innerHTML = out
    })
}

function calcEquation() {
    let eq = document.getElementById("eqInput").value.trim()
    let target = document.getElementById("targetInput").value.trim()
    let side = document.getElementById("sideSelect").value

    if (!eq || !target) {
        document.getElementById("eqResult").innerHTML = "Enter equation AND target."
        return
    }

    let data = new FormData()
    data.append("equation", eq)
    data.append("target", target)
    data.append("side", side)

    fetch("/composition/equation", { method: "POST", body: data })
    .then(r => r.json())
    .then(d => {

        if (d.error) {
            document.getElementById("eqResult").innerHTML = "Invalid input"
            return
        }

        // Pretty formatted output
        document.getElementById("eqResult").innerHTML =
            `<b>Percentage of ${d.target} on ${side}:</b><br><br>` +
            `${d.percent}%`
    })
}
