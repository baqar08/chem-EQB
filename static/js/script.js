function normalizeInput(str) {
    //string manipulation
    const subs = {
        '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'
    };
    str = str.replace(/./g, ch => subs[ch] || ch);

    str = str.replace(/→|⇒|↦|➜|➔|—>|-->/g, '=');
    str = str.replace(/→|=>/g, '=');

    str = str.replace(/\u2013|\u2014/g, '-');

    str = str.replace(/[＋]/g, '+');
    return str.replace(/\s+/g, ' ').trim();
}
function parseFormula(formula) {
    let i = 0;

    function parseNumber() {
        let num = '';
        while (i < formula.length && /\d/.test(formula[i])) {
            num += formula[i++];
        }
        return num === '' ? 1 : parseInt(num, 10);
    }

    function parseElement() {
        if (!/[A-Z]/.test(formula[i])) return null;
        let el = formula[i++];
        while (i < formula.length && /[a-z]/.test(formula[i])) {
            el += formula[i++];
        }
        return el;
    }

    function mergeCounts(target, addition, mul=1) {
        for (const k in addition) {
            target[k] = (target[k] || 0) + addition[k] * mul;
        }
    }

    function parseGroup() {
        const counts = {};
        while (i < formula.length) {
            const ch = formula[i];
            if (ch === '(') {
                i++;                 const inner = parseGroup(); 
                const mult = parseNumber();
                mergeCounts(counts, inner, mult);
            } else if (ch === ')') {
                i++; 
                return counts;
            } else if (/[A-Z]/.test(ch)) {
                const el = parseElement();
                const num = parseNumber();
                counts[el] = (counts[el] || 0) + num;
            } else {
                throw new Error(`Unexpected character '${ch}' in formula "${formula}"`);
            }
        }
        return counts;
    }

    i = 0;
    const result = parseGroup();
    if (i < formula.length) {
        throw new Error(`Could not parse formula "${formula}"`);
    }
    return result;
}
class Frac {
    constructor(n, d=1) {
        if (d === 0) throw new Error("Zero denominator");
        if (d < 0) { n = -n; d = -d; }
        const g = gcd(Math.abs(n), Math.abs(d));
        this.n = n / g;
        this.d = d / g;
    }
    add(b) { return new Frac(this.n*b.d + b.n*this.d, this.d*b.d); }
    sub(b) { return new Frac(this.n*b.d - b.n*this.d, this.d*b.d); }
    mul(b) { return new Frac(this.n*b.n, this.d*b.d); }
    div(b) { return new Frac(this.n*b.d, this.d*b.n); }
    isZero() { return this.n === 0; }
    valueOf() { return this.n / this.d; }
}
function gcd(a,b){ if(!b) return a; return gcd(b, a % b); }
function lcm(a,b){ return (a / gcd(a,b)) * b; }

function balanceEquation(equationStr) {
    const norm = normalizeInput(equationStr);

    const parts = norm.split('=');
    if (parts.length !== 2) throw new Error("Equation must contain a single '=' or arrow between reactants and products.");

    const [lhsRaw, rhsRaw] = parts;
    function splitCompounds(sideStr) {
        return sideStr.split('+').map(s => s.trim()).filter(Boolean);
    }
    let leftList = splitCompounds(lhsRaw);
    let rightList = splitCompounds(rhsRaw);
    if (leftList.length === 0 || rightList.length === 0) throw new Error("Reactants or products missing.");

    function extractCoefficient(compStr) {
        const m = compStr.match(/^(\d+)\s*(.*)$/);
        if (m) return [parseInt(m[1],10), m[2]];
        return [null, compStr];
    }

    const compounds = []; 
    for (const f of leftList) {
        const [userCoef, formula] = extractCoefficient(f);
        compounds.push({side: 1, formula: formula, counts: parseFormula(formula), userCoef});
    }
    for (const f of rightList) {
        const [userCoef, formula] = extractCoefficient(f);
        compounds.push({side: -1, formula: formula, counts: parseFormula(formula), userCoef});
    }

    const elements = [];
    const elemSet = new Set();
    for (const c of compounds) {
        for (const el in c.counts) {
            if (!elemSet.has(el)) { elemSet.add(el); elements.push(el); }
        }
    }

    const rows = elements.length;
    const cols = compounds.length;
    const A = Array.from({length: rows}, () => Array.from({length: cols}, () => new Frac(0,1)));
    for (let j=0;j<cols;j++){
        const comp = compounds[j];
        for (let i=0;i<rows;i++){
            const el = elements[i];
            const cnt = comp.counts[el] || 0;
            A[i][j] = new Frac(cnt * comp.side, 1);
        }
    }

    const M = A.map(row => row.map(v => new Frac(v.n, v.d)));

    const r = rows, c = cols;
    let row = 0;
    const pivotCols = [];
    for (let col=0; col<c && row<r; col++){
        let sel = -1;
        for (let i=row;i<r;i++){
            if (!M[i][col].isZero()) { sel = i; break; }
        }
        if (sel === -1) continue;
        if (sel !== row) {
            const tmp = M[sel]; M[sel] = M[row]; M[row] = tmp;
        }
        const pivot = M[row][col];
        for (let j=col;j<c;j++) M[row][j] = M[row][j].div(pivot);
        for (let i=0;i<r;i++){
            if (i===row) continue;
            const factor = M[i][col];
            if (factor.isZero()) continue;
            for (let j=col;j<c;j++){
                M[i][j] = M[i][j].sub(factor.mul(M[row][j]));
            }
        }
        pivotCols.push(col);
        row++;
    }
    const pivotSet = new Set(pivotCols);
    const freeCols = [];
    for (let j=0;j<c;j++) if (!pivotSet.has(j)) freeCols.push(j);
    if (freeCols.length === 0) {
        freeCols.push(c-1);
    }
    const solution = Array(c).fill(new Frac(0,1));
    const freeVarIndex = freeCols[0];
    solution[freeVarIndex] = new Frac(1,1);

    for (let k=0;k<pivotCols.length;k++){
        const pc = pivotCols[k];
        let s = new Frac(0,1);
        for (const j of freeCols) {
            s = s.add( M[k][j].mul(solution[j]) );
        }
        solution[pc] = s.mul(new Frac(-1,1));
    }

    let commonDen = 1;
    for (let j=0;j<c;j++){
        commonDen = lcm(commonDen, Math.abs(solution[j].d));
    }
    const ints = solution.map(fr => (fr.n * (commonDen / fr.d)));
    let intArr = ints.map(x => Math.round(x)); 
    const anyNeg = intArr.some(x => x < 0);
    if (anyNeg) intArr = intArr.map(x => -x);

    if (intArr.every(x => x === 0)) throw new Error("Failed to compute non-trivial coefficients.");

    let g = 0;
    for (const v of intArr) if (v !== 0) g = g === 0 ? Math.abs(v) : gcd(g, Math.abs(v));
    if (g === 0) g = 1;
    intArr = intArr.map(v => Math.round(v / g));

    const result = compounds.map((comp, idx) => ({formula: comp.formula, coefficient: intArr[idx]}));
    return result;
}

function balance() {
    const input = document.getElementById('eqInput').value || '';
    const out = document.getElementById('result');
    out.textContent = '';
    try {
        const res = balanceEquation(input);
        const left = res.slice(0, Math.floor(res.length/2));
        const right = res.slice(Math.floor(res.length/2));
        const norm = normalizeInput(input);
        const parts = norm.split('=');
        const leftParts = parts[0].split('+').map(s => s.trim()).filter(Boolean);
        const rightParts = parts[1].split('+').map(s => s.trim()).filter(Boolean);

        const leftStrs = [];
        for (let i=0;i<leftParts.length;i++){
            const coef = res[i].coefficient;
            const f = res[i].formula;
            leftStrs.push((coef !== 1 ? coef : '') + f);
        }
        const rightStrs = [];
        for (let i=0;i<rightParts.length;i++){
            const coef = res[leftParts.length + i].coefficient;
            const f = res[leftParts.length + i].formula;
            rightStrs.push((coef !== 1 ? coef : '') + f);
        }

        out.innerHTML = `<pre style="white-space:pre-wrap; font-size:18px;">${leftStrs.join(' + ')} = ${rightStrs.join(' + ')}</pre>`;
    } catch (err) {
        out.textContent = "Error: " + err.message;
    }
}
