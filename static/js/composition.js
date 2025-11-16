function showMode() {
    let mode = document.getElementById("modeSelect").value;

    document.getElementById("singleMode").style.display = "none";
    document.getElementById("equationMode").style.display = "none";

    if (mode === "single") document.getElementById("singleMode").style.display = "block";
    if (mode === "equation") document.getElementById("equationMode").style.display = "block";
}

function singleComposition() {
    let data = new FormData();
    data.append("compound", document.getElementById("singleComp").value);
    data.append("element", document.getElementById("singleElem").value);

    fetch("/composition/single", { method: "POST", body: data })
    .then(r => r.json())
    .then(res => {
        if (res.error) {
            document.getElementById("singleResult").innerHTML = "Invalid input";
            return;
        }
        document.getElementById("singleResult").innerHTML =
            "Percent Composition: <b>" + res.percent + "%</b>";
    });
}

function equationComposition() {
    let data = new FormData();
    data.append("equation", document.getElementById("eqInputComp").value);
    data.append("target", document.getElementById("targetComp").value);

    fetch("/composition/equation", { method: "POST", body: data })
    .then(r => r.json())
    .then(res => {
        if (res.error) {
            document.getElementById("eqResult").innerHTML = "Invalid input";
            return;
        }

        let html = "";

        html += "<h3>Reactants</h3>";
        res.reactants.forEach(item => {
            html += item.compound + " → " + (item.percent === null ? "N/A" : item.percent + "%") + "<br>";
        });

        html += "<br><h3>Products</h3>";
        res.products.forEach(item => {
            html += item.compound + " → " + (item.percent === null ? "N/A" : item.percent + "%") + "<br>";
        });

        document.getElementById("eqResult").innerHTML = html;
    });
}
