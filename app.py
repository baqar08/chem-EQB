from flask import Flask, render_template, request, jsonify, url_for
from sympy import symbols, Eq, solve
import re
from math import gcd

app = Flask(__name__)

def balance_equation(equation):
    import re
    from sympy import Matrix, lcm

    # Convert lowercase to proper chemical form (h2 → H2)
    def normalize(comp):
        return re.sub(r'([a-z])', lambda m: m.group(1).upper(), comp.capitalize())

    equation = equation.replace(" ", "")
    left, right = equation.split("=")

    left_compounds = [normalize(c) for c in left.split("+")]
    right_compounds = [normalize(c) for c in right.split("+")]
    compounds = left_compounds + right_compounds

    element_pattern = r"([A-Z][a-z]?)(\d*)"

    # extract all elements
    elements = sorted(set(
        elem for comp in compounds
        for elem, num in re.findall(element_pattern, comp)
    ))

    if not elements:
        return None, None, None

    # build matrix rows
    rows = []
    for elem in elements:
        row = []
        for comp in compounds:
            total = 0
            for e, n in re.findall(element_pattern, comp):
                if e == elem:
                    total += int(n) if n else 1
            row.append(total)
        rows.append(row)

    # left positive, right negative
    for i in range(len(elements)):
        for j in range(len(left_compounds), len(compounds)):
            rows[i][j] *= -1

    m = Matrix(rows)
    ns = m.nullspace()

    if not ns:
        return None, None, None

    vec = ns[0]
    lcm_val = lcm([term.q for term in vec])
    coeffs = [int(term * lcm_val) for term in vec]

    return coeffs, left_compounds, right_compounds

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/balance", methods=["POST"])
def balance():
    eq = request.form["equation"]
    coeffs, left, right = balance_equation(eq)

    if coeffs is None:
        return jsonify({"error": "invalid"})

    return jsonify({
        "coefficients": coeffs,
        "left": left,
        "right": right
    })

if __name__ == "__main__":
    app.run(debug=True)