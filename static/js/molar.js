function calculateMolar() {
    let data = new FormData()
    data.append("compound", document.getElementById("molarInput").value)

    fetch("/molar", { method: "POST", body: data })
    .then(r => r.json())
    .then(data => {
        if (data.error) {
            document.getElementById("molarResult").innerHTML = "Invalid compound"
            return
        }
        document.getElementById("molarResult").innerHTML =
            "Molar Mass: " + data.mass + " g/mol"
    })
}
