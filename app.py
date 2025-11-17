from flask import Flask, render_template, request, jsonify
import re
from sympy import Matrix, lcm

app = Flask(__name__)

atomic_mass = {
    "H": 1.008, "He": 4.0026, "Li": 6.94, "Be": 9.0122, "B": 10.81, "C": 12.011,
    "N": 14.007, "O": 15.999, "F": 18.998, "Na": 22.99, "Mg": 24.305,
    "Al": 26.982, "Si": 28.085, "P": 30.974, "S": 32.06, "Cl": 35.45,
    "K": 39.098, "Ca": 40.078
}

def balance_equation(equation):
    def normalize(c):
        return re.sub(r'([a-z])', lambda m: m.group(1).upper(), c.capitalize())

    equation = equation.replace(" ", "")
    left, right = equation.split("=")
    left_compounds = [normalize(c) for c in left.split("+")]
    right_compounds = [normalize(c) for c in right.split("+")]
    compounds = left_compounds + right_compounds

    pattern = r"([A-Z][a-z]?)(\d*)"
    elements = sorted(set(elem for comp in compounds for elem, n in re.findall(pattern, comp)))
    if not elements:
        return None, None, None

    rows = []
    for elem in elements:
        row = []
        for comp in compounds:
            total = 0
            for e, n in re.findall(pattern, comp):
                if e == elem:
                    total += int(n) if n else 1
            row.append(total)
        rows.append(row)

    for i in range(len(elements)):
        for j in range(len(left_compounds), len(compounds)):
            rows[i][j] *= -1

    m = Matrix(rows)
    ns = m.nullspace()
    if not ns:
        return None, None, None

    vec = ns[0]
    lcm_val = lcm([t.q for t in vec])
    coeffs = [int(t * lcm_val) for t in vec]

    return coeffs, left_compounds, right_compounds

def calculate_molar_mass(formula):
    pattern = r'([A-Z][a-z]?|\d+|\(|\))'
    tokens = re.findall(pattern, formula)
    stack = [ {} ]
    i = 0

    while i < len(tokens):
        t = tokens[i]

        if t == "(":
            stack.append({})
        elif t == ")":
            g = stack.pop()
            m = 1
            if i + 1 < len(tokens) and tokens[i+1].isdigit():
                m = int(tokens[i+1])
                i += 1
            for e in g:
                stack[-1][e] = stack[-1].get(e, 0) + g[e] * m
        elif re.match(r'[A-Z][a-z]?', t):
            e = t
            c = 1
            if i + 1 < len(tokens) and tokens[i+1].isdigit():
                c = int(tokens[i+1])
                i += 1
            stack[-1][e] = stack[-1].get(e, 0) + c

        i += 1

    total = 0
    for e, c in stack[-1].items():
        if e not in atomic_mass:
            return None
        total += atomic_mass[e] * c

    return round(total, 3)

def formula_breakdown(formula):
    pattern = r'([A-Z][a-z]?|\d+|\(|\))'
    tokens = re.findall(pattern, formula)
    stack = [ {} ]
    i = 0

    while i < len(tokens):
        t = tokens[i]

        if t == "(":
            stack.append({})
        elif t == ")":
            g = stack.pop()
            m = 1
            if i + 1 < len(tokens) and tokens[i+1].isdigit():
                m = int(tokens[i+1])
                i += 1
            for e in g:
                stack[-1][e] = stack[-1].get(e, 0) + g[e] * m
        elif re.match(r'[A-Z][a-z]?', t):
            e = t
            c = 1
            if i + 1 < len(tokens) and tokens[i+1].isdigit():
                c = int(tokens[i+1])
                i += 1
            stack[-1][e] = stack[-1].get(e, 0) + c

        i += 1

    return stack[-1]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/molar")
def molar():
    return render_template("molar.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/composition")
def composition():
    return render_template("composition.html")

@app.route("/balance", methods=["POST"])
def balance():
    eq = request.form["equation"]
    coeffs, left, right = balance_equation(eq)
    if coeffs is None:
        return jsonify({"error": "invalid"})
    return jsonify({"coefficients": coeffs, "left": left, "right": right})

@app.route("/molar", methods=["POST"])
def molar_calc():
    comp = request.form["compound"]
    mass = calculate_molar_mass(comp)
    if mass is None:
        return jsonify({"error": True})
    return jsonify({"mass": mass})

@app.route("/composition/single", methods=["POST"])
def comp_single():
    comp = request.form["compound"]
    bd = formula_breakdown(comp)
    total_mass = 0
    result = {}

    for e, c in bd.items():
        if e not in atomic_mass:
            return jsonify({})
        total_mass += atomic_mass[e] * c

    for e, c in bd.items():
        pct = (atomic_mass[e] * c / total_mass) * 100
        result[e] = round(pct, 2)

    return jsonify(result)

@app.route("/composition/equation", methods=["POST"])
def comp_equation():
    eq = request.form["equation"]
    target = request.form["target"]
    side = request.form["side"]

    coeffs, left, right = balance_equation(eq)
    if coeffs is None:
        return jsonify({"error": True})

    if side == "reactants":
        comps = left
        cfs = coeffs[:len(left)]
    else:
        comps = right
        cfs = coeffs[len(left):]

    total_mass = 0
    target_mass = 0

    for comp, cf in zip(comps, cfs):
        bd = formula_breakdown(comp)
        mass = sum(atomic_mass[e] * bd[e] for e in bd if e in atomic_mass)
        total_mass += mass * cf

        if comp == target:
            target_mass += mass * cf
        elif target in bd:
            target_mass += atomic_mass[target] * bd[target] * cf

    if total_mass == 0:
        return jsonify({"error": True})

    pct = (target_mass / total_mass) * 100
    return jsonify({"target": target, "percent": round(pct, 2)})

if __name__ == "__main__":
    app.run(debug=True)
