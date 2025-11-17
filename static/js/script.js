function parseCompound(compound) {
    let tokens = compound.match(/([A-Z][a-z]?|\(|\)|\d+)/g);
    let stack = [{}];

    for (let i = 0; i < tokens.length; i++) {
        let t = tokens[i];

        if (t === '(') {
            stack.push({});
        } else if (t === ')') {
            let group = stack.pop();
            let mult = (i + 1 < tokens.length && /^\d+$/.test(tokens[i+1])) ? parseInt(tokens[++i]) : 1;

            for (let el in group) {
                stack[stack.length - 1][el] =
                    (stack[stack.length - 1][el] || 0) + group[el] * mult;
            }
        } else if (/^[A-Z]/.test(t)) {
            let el = t;
            let count = (i + 1 < tokens.length && /^\d+$/.test(tokens[i+1])) ? parseInt(tokens[++i]) : 1;

            stack[stack.length - 1][el] =
                (stack[stack.length - 1][el] || 0) + count;
        }
    }
    return stack[0];
}

function balanceEquation(eq) {
    let [left, right] = eq.split("=");
    let reactants = left.split("+").map(s => s.trim());
    let products = right.split("+").map(s => s.trim());
    let all = reactants.concat(products);

    let elements = {};
    all.forEach((compound, idx) => {
        let parsed = parseCompound(compound);
        for (let el in parsed) {
            if (!elements[el]) elements[el] = new Array(all.length).fill(0);
            elements[el][idx] = parsed[el];
        }
    });

    let matrix = Object.values(elements).map(row => row.slice());

    // Make product coefficients negative
    matrix = matrix.map(row => row.map((v, i) =>
        i < reactants.length ? v : -v
    ));

    // Solve using algebraic nullspace (simple Gauss)
    let cols = all.length;
    let rows = matrix.length;

    for (let i = 0; i < rows; i++) {
        let pivot = matrix[i][i];

        for (let j = i + 1; j < rows; j++) {
            let ratio = matrix[j][i] / pivot;
            for (let k = 0; k < cols; k++) {
                matrix[j][k] -= ratio * matrix[i][k];
            }
        }
    }

    let solution = new Array(cols).fill(0);
    solution[cols - 1] = 1;

    for (let i = rows - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < cols; j++) {
            sum += matrix[i][j] * solution[j];
        }
        solution[i] = -sum / matrix[i][i];
    }

    // Normalize to smallest integers
    let denom = solution.map(v => 1 / (v % 1)).filter(v => v !== Infinity);
    let mult = denom.length ? Math.round(Math.max(...denom)) : 1;

    solution = solution.map(v => Math.round(v * mult));

    // Remove coefficient 1
    function format(c, compound) {
        return (c === 1 ? "" : c) + compound;
    }

    let leftSide = solution.slice(0, reactants.length)
        .map((c, i) => format(c, reactants[i])).join(" + ");

    let rightSide = solution.slice(reactants.length)
        .map((c, i) => format(c, products[i])).join(" + ");

    return leftSide + " → " + rightSide;
}
