function balance() {
    let data = new FormData()
    data.append("equation", document.getElementById("eqInput").value)

    fetch("/balance", { method: "POST", body: data })
    .then(res => res.json())
    .then(data => {

        if (data.error) {
            document.getElementById("result").innerHTML = "Invalid equation"
            return
        }

        let coeffs = data.coefficients
        let left = data.left
        let right = data.right

        let leftSide = ""
        for (let i = 0; i < left.length; i++) {
            leftSide += coeffs[i] + left[i]
            if (i < left.length - 1) leftSide += " + "
        }

        let rightSide = ""
        for (let i = 0; i < right.length; i++) {
            rightSide += coeffs[left.length + i] + right[i]
            if (i < right.length - 1) rightSide += " + "
        }

        document.getElementById("result").innerHTML = leftSide + " → " + rightSide
    })
}