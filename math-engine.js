// ====== Math Card Engine (計算エンジン) ======
// Phase 3.0: Arithmetic Mode Support (Fraction Step-by-Step)

// ---------------------------------------------------------
// 1. Fraction Class (有理数クラス)
// ---------------------------------------------------------
class Fraction {
    // ★変更: autoReduce 引数を追加 (デフォルトは true で既存動作を維持)
    constructor(numerator, denominator = 1, autoReduce = true) {
        if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
           const factor = 10000000000;
            numerator = Math.round(numerator * factor);
            denominator = Math.round(denominator * factor);
        }
        if (denominator === 0) { console.error("Zero Division!"); denominator = 1; }
        
        // 符号の整理
        this.s = (numerator * denominator < 0) ? -1 : 1;
        this.n = Math.abs(numerator);
        this.d = Math.abs(denominator);
        
        // 元の値を保持（あまり計算などで使う）
        this.on = this.n;
        this.od = this.d;

        // ★変更: フラグが true の時だけ約分する
        if (autoReduce) {
            this.reduce();
        }
    }

    reduce() {
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const g = gcd(this.n, this.d);
        this.n /= g; this.d /= g;
    }

    add(other) {
        const n1 = this.s * this.n; const n2 = other.s * other.n;
        return new Fraction(n1 * other.d + n2 * this.d, this.d * other.d);
    }
    sub(other) {
        const n1 = this.s * this.n; const n2 = other.s * other.n;
        return new Fraction(n1 * other.d - n2 * this.d, this.d * other.d);
    }
    mul(other) {
        return new Fraction(this.s * other.s * this.n * other.n, this.d * other.d);
    }
    div(other) {
        return new Fraction(this.s * other.s * this.n * other.d, this.d * other.n);
    }
    inverse() {
        return new Fraction(this.s * this.d, this.n);
    }
    pow(expFrac) {
        if (expFrac.d === 1) {
            const exp = expFrac.s * expFrac.n;
            if (exp === 0) return new Fraction(1);
            if (exp > 0) return new Fraction(Math.pow(this.s * this.n, exp), Math.pow(this.d, exp));
            if (exp < 0) return new Fraction(Math.pow(this.d, -exp), Math.pow(this.s * this.n, -exp));
        }
        return new Fraction(0);
    }
    
    // ★追加: 通分などのために、強制的に分母を指定した新しい分数を作るメソッド
    scaleTo(newDenominator) {
        if (newDenominator % this.d !== 0) {
            console.warn("Cannot scale fraction simply (integers only)");
            return this;
        }
        const factor = newDenominator / this.d;
        // 約分しない状態で返す
        return new Fraction(this.s * this.n * factor, newDenominator, false);
    }

    valueOf() { return this.s * this.n / this.d; }
    toString() {
        if (this.n === 0) return "0";
        const sign = this.s < 0 ? "-" : "";
        if (this.d === 1) return sign + this.n;
        return `${sign}${this.n}/${this.d}`;
    }
}

// ---------------------------------------------------------
// 2. Surd Class (ルート単項式クラス)
// ---------------------------------------------------------
class Surd {
    constructor(coeff, root = 1, vars = {}) {
        this.coeff = coeff; // Fraction
        this.root = root;   // Integer
        this.vars = vars;   // Object { x: 1, y: 2 }
        this.simplify();
    }

    simplify() {
        if (this.root === 0) {
            this.coeff = new Fraction(0);
            this.root = 1;
            this.vars = {};
            return;
        }
        if (this.root === 1) return;

        let outside = 1;
        let inside = this.root;
        let d = 2;
        while (d * d <= inside) {
            while (inside % (d * d) === 0) {
                outside *= d;
                inside /= (d * d);
            }
            d++;
        }
        this.root = inside;
        if (outside > 1) {
            this.coeff = this.coeff.mul(new Fraction(outside));
        }
    }

    mul(other) {
        const newCoeff = this.coeff.mul(other.coeff);
        const newRoot = this.root * other.root;
        
        const newVars = { ...this.vars };
        for (let v in other.vars) {
            if (newVars[v]) {
                newVars[v] += other.vars[v];
            } else {
                newVars[v] = other.vars[v];
            }
        }
        return new Surd(newCoeff, newRoot, newVars);
    }
    
    isLikeTerm(other) {
        if (this.root !== other.root) return false;
        const keysA = Object.keys(this.vars).sort();
        const keysB = Object.keys(other.vars).sort();
        if (keysA.length !== keysB.length) return false;
        for (let k of keysA) {
            if (keysB.indexOf(k) === -1) return false;
            if (this.vars[k] !== other.vars[k]) return false;
        }
        return true;
    }

    toString() {
        if (this.coeff.n === 0) return "";
        let s = "";
        
        let varStr = "";
        const keys = Object.keys(this.vars).sort();
        for (let k of keys) {
            const exp = this.vars[k];
            if (exp === 1) varStr += k;
            else varStr += `${k}^${exp}`;
        }

        const absCoeff = Math.abs(this.coeff.valueOf());
        const isCoeffOne = (absCoeff === 1 && this.coeff.d === 1);
        
        if (this.coeff.s === -1) s += "-";

        const hasVars = varStr.length > 0;
        const hasRoot = this.root !== 1;

        if (isCoeffOne) {
            if (!hasVars && !hasRoot) s += "1";
        } else {
            const c = new Fraction(this.coeff.n, this.coeff.d);
            if (c.d === 1) s += c.n;
            else s += `${c.n}/${c.d}`;
        }
        
        if (hasRoot) s += `√${this.root}`;
        s += varStr;

        return s;
    }
}

// ---------------------------------------------------------
// 3. Poly Class (多項式クラス)
// ---------------------------------------------------------
class Poly {
    constructor(terms = []) {
        this.terms = terms; 
        this.collectTerms();
    }

    collectTerms() {
        if (this.terms.length <= 1) return;

        const newTerms = [];
        const groups = {};
        
        for (let term of this.terms) {
            let varKey = Object.keys(term.vars).sort().map(k => `${k}${term.vars[k]}`).join("_");
            const key = `r${term.root}_v${varKey}`;

            if (!groups[key]) {
                groups[key] = {
                    baseTerm: term,
                    totalCoeff: term.coeff 
                };
            } else {
                groups[key].totalCoeff = groups[key].totalCoeff.add(term.coeff);
            }
        }

        for (let key in groups) {
            const g = groups[key];
            if (g.totalCoeff.n !== 0) {
                newTerms.push(new Surd(g.totalCoeff, g.baseTerm.root, { ...g.baseTerm.vars }));
            }
        }
        
        if (newTerms.length === 0) {
            newTerms.push(new Surd(new Fraction(0), 1));
        }
        this.terms = newTerms;
    }

    add(otherPoly) {
        return new Poly([...this.terms, ...otherPoly.terms]);
    }


    sub(otherPoly) {
        const negatedTerms = otherPoly.terms.map(t => {
            // 係数をマイナスにする
            const negCoeff = t.coeff.mul(new Fraction(-1));
            
            // ★★★ 修正ポイント！ ★★★
            // 以前: return new Surd(negCoeff, t.root); // ← ここで変数を渡し忘れてた！
            // 修正: 第3引数に t.vars をコピーして渡す！
            return new Surd(negCoeff, t.root, { ...t.vars });
        });
        return new Poly([...this.terms, ...negatedTerms]);
    }

    mul(otherPoly) {
        const newTerms = [];
        for (let t1 of this.terms) {
            for (let t2 of otherPoly.terms) {
                newTerms.push(t1.mul(t2));
            }
        }
        return new Poly(newTerms);
    }
    
    div(otherPoly) {
        if (this.terms.length === 1 && otherPoly.terms.length === 1) {
             const t1 = this.terms[0];
             const t2 = otherPoly.terms[0];
             const newCoeff = t1.coeff.div(t2.coeff);
             
             if (t1.root % t2.root === 0) {
                 return new Poly([new Surd(newCoeff, t1.root / t2.root)]);
             }
             if (t2.root === 1) {
                 return new Poly([new Surd(newCoeff, t1.root)]);
             }
        }
        console.warn("Complex division not supported yet");
        return this; 
    }
    
    pow(expPoly) {
        if (expPoly.terms.length === 1 && expPoly.terms[0].root === 1 && expPoly.terms[0].coeff.d === 1) {
             const exp = expPoly.terms[0].coeff.valueOf();
             if (exp === 0) return new Poly([new Surd(new Fraction(1))]);
             if (exp === 1) return this;
             
             let result = new Poly([new Surd(new Fraction(1))]);
             for (let i=0; i<exp; i++) {
                 result = result.mul(this);
             }
             return result;
        }
        return new Poly([new Surd(new Fraction(0))]);
    }

    toString() {
        if (this.terms.length === 0) return "0";
        let s = "";
        this.terms.forEach((term, index) => {
            const termStr = term.toString();
            if (termStr === "") return;

            if (index === 0) {
                s += termStr;
            } else {
                if (term.coeff.s >= 0) {
                    s += " + " + termStr;
                } else {
                    s += " - " + termStr.replace("-", "");
                }
            }
        });
        return s || "0";
    }
}


// ---------------------------------------------------------
// 4. MathEngine (ステップ実行対応版)
// ---------------------------------------------------------
const MathEngine = {
    // コンフィグを外部から注入できるように
    // (script.js側で App.state.appMode をここにセットすることを想定)
    config: { mode: 'arithmetic', displayMode: 'fraction' },

    init() {
        console.log("Math Engine: Ready! (Arithmetic/Math Modes Supported 🌰)");
    },

    // --- Utility Functions ---
    gcd(a, b) { return b ? this.gcd(b, a % b) : a; },
    lcm(a, b) { return (a * b) / this.gcd(a, b); },

    // --- Phase 1: Parser ---

    parse(cardElements) {
        let parsedNodes = [];
        let numberBuffer = ""; 
        let pendingNegative = false;

        const flushBuffer = () => {
            if (numberBuffer !== "") {
                let val = parseFloat(numberBuffer);
                if (pendingNegative) { val = -val; pendingNegative = false; }
                const numNode = { type: 'number', value: val };
                checkImplicit(numNode);
                parsedNodes.push(numNode);
                numberBuffer = "";
            }
        };

        const checkImplicit = (curr) => {
            if (parsedNodes.length === 0) return;
            const prev = parsedNodes[parsedNodes.length - 1];
            
            if (prev.type === 'number' && curr.type === 'variable') {
                parsedNodes.pop();
                const vars = {};
                vars[curr.value] = 1;
                const polyNode = new Poly([new Surd(new Fraction(prev.value), 1, vars)]);
                parsedNodes.push(polyNode);
                curr.type = 'merged'; 
                return;
            }

            const pT = (prev.type==='number'||prev.type==='structure'||prev.type==='variable'||prev instanceof Poly);
            const cT = (curr.type==='structure'||curr.type==='variable'||curr instanceof Poly);
            
            if ((prev.type==='number' && curr.type==='structure') || (pT && cT)) {
                 parsedNodes.push({ type: 'operator', value: '*' });
            }
        };

        cardElements.forEach(card => {
            const type = this.identifyType(card);
            
            if (['root', 'fraction', 'sqrt', 'power', 'symbol'].includes(type)) {
                flushBuffer();
                if (pendingNegative) {
                    const m1 = { type: 'number', value: -1 };
                    checkImplicit(m1); parsedNodes.push(m1); pendingNegative = false;
                }
                
                let sn = { type: 'structure', subType: type, children: [] };
                
                if (type === 'root') {
                    const s = card.querySelector('.root-slot');
                    if (s) {
                        const c = this.parse(Array.from(s.querySelectorAll(':scope > .math-card')));
                        if (c.length > 0) { checkImplicit(c[0]); parsedNodes = parsedNodes.concat(c); }
                    }
                    return;
                } else if (type === 'fraction') {
                    sn.integer = this.parseSlot(card, '.integer-part');
                    sn.numerator = this.parseSlot(card, '.numerator');
                    sn.denominator = this.parseSlot(card, '.denominator');
                } else if (type === 'sqrt') {
                    sn.coefficient = this.parseSlot(card, '.coefficient-part');
                    sn.content = this.parseSlot(card, '.sqrt-border-top');
                } else if (type === 'power') {
                    sn.base = this.parseSlot(card, '.base-slot');
                    sn.exponent = this.parseSlot(card, '.exponent-slot');
                } else if (type === 'symbol') {
                    sn.symbolType = card.innerText.includes('|') ? 'abs' : 'parens';
                    sn.content = this.parseSlot(card, '.card-slot');
                }

                checkImplicit(sn); parsedNodes.push(sn);
                return;
            }
            
            if (type === 'operator') {
                const v = this.extractValue(card); flushBuffer();
                if (v === '-') {
                    const l = parsedNodes[parsedNodes.length - 1];
                    if (!l || l.type === 'operator') { pendingNegative = true; return; }
                }
                parsedNodes.push({ type: type, value: v }); return;
            }
            
            if (type === 'number') { numberBuffer += this.extractValue(card); }
            
            if (type === 'variable') {
                flushBuffer();
                if(pendingNegative) { const m={type:'number',value:-1}; checkImplicit(m); parsedNodes.push(m); pendingNegative=false;}
                const vn = { type:'variable', value:this.extractValue(card) };
                checkImplicit(vn); 
                if (vn.type !== 'merged') {
                    parsedNodes.push(vn);
                }
            }
        });
        
        flushBuffer();
        if (pendingNegative) {
            const m = { type: 'number', value: -1, isPureSign: true };
            checkImplicit(m); parsedNodes.push(m);
        }
        return parsedNodes;
    },

    // =========================================================
    // Phase 2 Final: Step-by-Step Logic
    // =========================================================

    calculate(nodes) {
        if (!nodes || nodes.length === 0) return null;
        console.log("Input Formula:", this.nodesToString(nodes));

        let currentNodes = nodes;
        let stepCount = 1;
        
        while (stepCount <= 10) {
            const nextResult = this.stepSolve(currentNodes);
            
            if (!nextResult.changed) {
                if (currentNodes.length === 1 && currentNodes[0] instanceof Poly) {
                    return currentNodes[0];
                }
                return currentNodes[0]; 
            }

            currentNodes = nextResult.nodes;
            const stepStr = this.nodesToString(currentNodes);
            console.log(`[Step ${stepCount}] ->`, stepStr);
            stepCount++;
        }
        return currentNodes[0];
    },



    stepSolve(nodes) {
        let newNodes = [...nodes];
        let changed = false;
        
        // ★ヘルパー: 中身が単純な数値(または変数)だけかチェックする関数
        const isSimple = (list) => {
            if (!list || list.length === 0) return true;
            if (list.length > 1) return false; 
            // 数字か、変数なら「シンプル」とみなす
            return list[0].type === 'number' || list[0].type === 'variable';  
        };

        // 作戦1: 構造物の計算 (Unboxing)
        for (let i = 0; i < newNodes.length; i++) {
            const node = newNodes[i];
            if (node.type === 'structure') {
                let evaluated = this.evaluateStructureSimple(node);
                if (evaluated) {
                    
                    if (evaluated.type === 'error') {
                        return { nodes: [evaluated], changed: true };
                    }

                    let isMeaningful = true;
                    
                    // √のチェック
                    if (node.subType === 'sqrt') {
                        if (evaluated.terms.length === 1) {
                            const t = evaluated.terms[0];
                            if (t.root !== 1 && Math.abs(t.coeff.valueOf()) === 1) {
                                isMeaningful = false; 
                            }
                        }
                    }
                    
                    // 分数コンテナのチェック
                    if (node.subType === 'fraction') {
                        if (isSimple(node.numerator) && isSimple(node.denominator)) {
                            isMeaningful = false; 
                        } else {
                            isMeaningful = true;
                        }
                    }

                    // ★追加: べき乗(Power)コンテナのチェック
                    // 「aの2乗」のように中身がシンプルな時は、箱を開けただけで止まらず、計算を続行させる！
                    if (node.subType === 'power') {
                        if (isSimple(node.base) && isSimple(node.exponent)) {
                            isMeaningful = false;
                        } else {
                            isMeaningful = true;
                        }
                    }

                    // ★追加: 記号コンテナ (|x| や ( ) ) の処理
                    if (node.subType === 'symbol') {
                        
                        // パターンA: 絶対値 |...|
                        if (node.symbolType === 'abs') {
                            // 中身が「純粋な数字」になったかチェック
                            // (変数 x とかが残っていると、プラスかマイナスかわからないから外せないの)
                            if (evaluated.terms.length === 1 && 
                                Object.keys(evaluated.terms[0].vars).length === 0 &&
                                evaluated.terms[0].root === 1) {
                                
                                // 係数をチェック
                                const val = evaluated.terms[0].coeff.valueOf();
                                
                                if (val < 0) {
                                    // マイナスなら、-1 をかけてプラスにする魔法！
                                    const positivePoly = evaluated.mul(new Poly([new Surd(new Fraction(-1))]));
                                    evaluated = positivePoly;
                                }
                                // プラスなら何もしない（そのまま出してOK）
                                
                                isMeaningful = true; // 箱が外れるので「変化あり」
                            } else {
                                // まだ中身が計算できない（変数など）なら、箱は外さない
                                isMeaningful = false; 
                            }
                        }
                        
                        // パターンB: ただのカッコ ( )

                        else if (node.symbolType === 'parens') {
                            
                            let shouldUnbox = true; // 基本は外す

                            // ★ここが新ルール！
                            // 中身が「ただの負の数」になった場合...
                            if (evaluated.terms.length === 1 && 
                                evaluated.terms[0].root === 1 && 
                                Object.keys(evaluated.terms[0].vars).length === 0) {
                                
                                const val = evaluated.terms[0].coeff.valueOf();
                                if (val < 0) {
                                    // 前のノードをチラ見する
                                    const prev = (i > 0) ? newNodes[i-1] : null;
                                    
                                    // 前に演算子がいるなら、カッコは外さない！（衝突事故防止）
                                    if (prev && prev.type === 'operator') {
                                        shouldUnbox = false;
                                    }
                                }
                            }

                            if (shouldUnbox) {
                                // カッコを外して中身(evaluated)にする
                                isMeaningful = true;
                                // (この後の newNodes[i] = evaluated; で中身になる)

                                } else {
                                // カッコを維持する場合
                                
                                // ★★★ 修正ポイント！ ★★★
                                // 元の中身(node.content)が、すでに単純な数値なら「変化なし」とみなしてスルーする！
                                // そうしないと、ここで満足して止まってしまい、下の足し算に進めないから。
                                const isContentSimple = (node.content.length === 1 && 
                                    (node.content[0].type === 'number' || node.content[0].type === 'variable'));

                                if (!isContentSimple) {
                                    // 中身が「2-7」みたいに計算が必要だったなら、
                                    // 「(-5)」になったことは立派な変化なので記録する
                                    newNodes[i] = {
                                        type: 'structure',
                                        subType: 'symbol',
                                        symbolType: 'parens',
                                        content: [ evaluated ] 
                                    };
                                    isMeaningful = true; 
                                } else {
                                    // すでに「(-5)」の状態なら、ここはスルーして足し算に進ませる！
                                    isMeaningful = false;
                                }
                                
                                evaluated = null; // 上書き防止
                            }
                        }
                    }

                    // evaluated が null の時は代入しないようにガード条件を追加
                    if (evaluated) {
                        newNodes[i] = evaluated;
                    }
                    
                    // 意味のある変化だった場合のみフラグを立てる
                    if (isMeaningful) changed = true;
                }
            }
        }

        // もし構造の変化（カッコの展開など）だけで「意味がある」と判定されたら、ここでストップして表示
        if (changed) return { nodes: newNodes, changed: true };


        // 作戦2: 掛け算・割り算 (*, /)
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if (op.type === 'operator' && ['*', '×', '/', '÷'].includes(op.value)) {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);
                
                if (p && n) {
                    let res;
                    if (op.value === '*' || op.value === '×') {
                        res = p.mul(n);
                        res.opType = 'mul'; 
                    } else {
                        // ゼロ除算チェック
                        let isZero = false;
                        if (n.terms.length === 1 && n.terms[0].coeff.n === 0) isZero = true;
                        
                        if (isZero) {
                            const errorNode = { type: 'error', value: '0では\nわれません' };
                            return { nodes: [errorNode], changed: true };
                        }

                        // ★ここから修正！ 正しい「余り」を計算してメモする処理
                        // 単純な数値同士の割り算なら、余りを計算しておく
                        if (p.terms.length === 1 && n.terms.length === 1 &&
                            p.terms[0].root === 1 && Object.keys(p.terms[0].vars).length === 0 &&
                            n.terms[0].root === 1 && Object.keys(n.terms[0].vars).length === 0) {
                            
                            const valA = p.terms[0].coeff; // 割られる数 (Fraction)
                            const valB = n.terms[0].coeff; // 割る数 (Fraction)
                            
                            // 商(整数) = floor(A / B)
                            const divVal = valA.div(valB);
                            const quotient = Math.floor(divVal.valueOf());
                            
                            // 余り = A - B × 商
                            const remFrac = valA.sub(valB.mul(new Fraction(quotient)));
                            const remVal = remFrac.valueOf(); // 小数または整数
                            
                            // 通常の計算結果を作成
                            res = p.div(n);
                            
                            // ★結果のPolyに「本当の余り」を貼り付けておく！
                            res.remainderVal = remVal;
                            
                        } else {
                            // 複雑な式なら普通に計算
                            res = p.div(n);
                        }
                        
                        res.opType = 'div'; 
                    }
                    newNodes.splice(i-1, 3, res); 
                    i = i - 1; 
                    changed = true;
                }
            }
        }

        if (changed) return { nodes: newNodes, changed: true };

        // 作戦3: 足し算・引き算 (+, -)
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if ((op.value === '+' || op.value === '-') && op.type === 'operator') {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);
                
                if (p && n) {
                    // 分数同士の足し算（通分ロジック）
                    if (p.terms.length === 1 && n.terms.length === 1) {
                        const t1 = p.terms[0];
                        const t2 = n.terms[0];

                        if (t1.root === 1 && Object.keys(t1.vars).length === 0 &&
                            t2.root === 1 && Object.keys(t2.vars).length === 0) {
                            
                            const lcmVal = this.lcm(t1.coeff.d, t2.coeff.d);


                            // A. 算数モード
                            if (this.config.mode === 'arithmetic') {
                                
                                // ★追加: 小数モードなら、分母が違っても一気に計算（通分スキップ）させるフラグ
                                const forceCalc = (this.config.displayMode === 'decimal');

                                // ★書き換え: !forceCalc を条件に追加（小数モードならここは通らない）
                                if (t1.coeff.d !== t2.coeff.d && !forceCalc) {
                                    const lcmVal = this.lcm(t1.coeff.d, t2.coeff.d); // lcmValの計算はここに移動してもいいけど、下のブロックでも使うから再計算が必要になるのよね
                                    // なので、ここは元のロジック通り、通分の式を作る場所なの。
                                    
                                    const f1 = t1.coeff.scaleTo(lcmVal);
                                    const f2 = t2.coeff.scaleTo(lcmVal);
                                    newNodes[i-1] = new Poly([new Surd(f1)]);
                                    newNodes[i+1] = new Poly([new Surd(f2)]);
                                    return { nodes: newNodes, changed: true };
                                }
                                // ★書き換え: 分母が同じ OR 強制計算(小数モード) の場合
                                else if ((t1.coeff.d === t2.coeff.d && t1.coeff.d !== 1) || forceCalc) {
                                    
                                    // 共通の分母（LCM）を計算
                                    const lcmVal = this.lcm(t1.coeff.d, t2.coeff.d);
                                    
                                    // 通分した分子を計算
                                    const n1 = t1.coeff.s * t1.coeff.n * (lcmVal / t1.coeff.d);
                                    const n2 = t2.coeff.s * t2.coeff.n * (lcmVal / t2.coeff.d);
                                    
                                    let newNum = (op.value === '+') ? n1 + n2 : n1 - n2;
                                    
                                    // 結果を作成（あえて約分autoReduce=trueで作成して、綺麗な形にする）
                                    const resFrac = new Fraction(newNum, lcmVal, true);
                                    newNodes.splice(i-1, 3, new Poly([new Surd(resFrac)]));
                                    return { nodes: newNodes, changed: true };
                                }
                            }
                            // B. 数学モード


                                    else if (this.config.mode === 'math') {
                                
                                // ★追加: 「小数モード」なら強制的に計算を進めるフラグ
                                // (算数モードの時と同じ考え方なの！)
                                const forceCalc = (this.config.displayMode === 'decimal');

                                const isPowerOfTen = (n) => {
                                    if (n < 10) return false; 
                                    let k = n;
                                    while (k > 1 && k % 10 === 0) k /= 10;
                                    return k === 1;
                                };

                                const lcmVal = this.lcm(t1.coeff.d, t2.coeff.d);
                                
                                // 「小数っぽい分母(10の累乗)」かどうかの判定
                                const isDecimalBased = isPowerOfTen(lcmVal);

                                // ★条件変更: 
                                // 「分母が違う」 かつ
                                // 「小数っぽくない(10の累乗以外)」 かつ
                                // 「小数モードでもない(!forceCalc)」 場合だけ、丁寧な通分ステップを作る
                                if (t1.coeff.d !== t2.coeff.d && !isDecimalBased && !forceCalc) {
                                    
                                    // ... (通分ステップを作る処理・変更なし) ...
                                    const num1Val = t1.coeff.s * t1.coeff.n * (lcmVal / t1.coeff.d);
                                    const num2Val = t2.coeff.s * t2.coeff.n * (lcmVal / t2.coeff.d);

                                    const numeratorNodes = [
                                        { type: 'number', value: num1Val },
                                        { type: 'operator', value: op.value }, 
                                        { type: 'number', value: Math.abs(num2Val) }
                                    ];
                                    if (op.value === '+' && num2Val < 0) numeratorNodes[1].value = '-';
                                    else if (op.value === '-' && num2Val < 0) numeratorNodes[1].value = '+';

                                    const mergedFraction = {
                                        type: 'structure',
                                        subType: 'fraction',
                                        numerator: numeratorNodes,
                                        denominator: [{ type: 'number', value: lcmVal }]
                                    };
                                    newNodes.splice(i-1, 3, mergedFraction);
                                    return { nodes: newNodes, changed: true };
                                }
                                
                                // ★それ以外（一気に計算するルート）
                                else {
                                    // ... (計算処理・変更なし) ...
                                    const n1 = t1.coeff.s * t1.coeff.n * (lcmVal / t1.coeff.d);
                                    const n2 = t2.coeff.s * t2.coeff.n * (lcmVal / t2.coeff.d);
                                    
                                    let newNum = (op.value === '+') ? n1 + n2 : n1 - n2;
                                    
                                    const resFrac = new Fraction(newNum, lcmVal, true);
                                    newNodes.splice(i-1, 3, new Poly([new Surd(resFrac)]));
                                    return { nodes: newNodes, changed: true };
                                }
                            }
                        }
                    }

                    // 通常計算
                    let res;
                    if (op.value === '+') {
                        res = p.add(n);
                        res.opType = 'add'; 
                    } else {
                        res = p.sub(n);
                        res.opType = 'sub'; 
                    }
                    newNodes.splice(i-1, 3, res);
                    return { nodes: newNodes, changed: true };
                }
            }
        }
        
        if (changed) return { nodes: newNodes, changed: true };

        // 作戦4: 最後の仕上げ（約分）
        if (newNodes.length === 1 && newNodes[0] instanceof Poly) {
             const poly = newNodes[0];
             if (poly.terms.length === 1) {
                 const term = poly.terms[0];
                 if (term.root === 1 && Object.keys(term.vars).length === 0) {
                      const f = term.coeff;
                      const gcdVal = this.gcd(f.n, f.d);
                      if (gcdVal > 1) {
                          const reducedFrac = new Fraction(f.s * f.n, f.d, true); 
                          newNodes[0] = new Poly([new Surd(reducedFrac)]);
                          return { nodes: newNodes, changed: true };
                      }
                 }
             }
        }

        return { nodes: newNodes, changed: false };
    },


    ensurePoly(node) {
        if (node instanceof Poly) return node;
        if (node.type === 'number') {
            return new Poly([new Surd(new Fraction(node.value), 1)]);
        }
        if (node.type === 'variable') {
            const vars = {};
            vars[node.value] = 1; 
            return new Poly([new Surd(new Fraction(1), 1, vars)]);
        }
        
        // ★追加: 構造体（カッコに入った数字など）も計算できるようにする
        if (node.type === 'structure') {
            const res = this.evaluateStructureSimple(node);
            if (res instanceof Poly) return res;
        }
        
        return null;
    },

    evaluateStructureSimple(node) {
        if (node instanceof Poly) return null;
        if (node.type === 'number') return new Poly([new Surd(new Fraction(node.value), 1)]);
        
        try {
            const result = this.evaluateNodeFull(node);
            return result;
        } catch (e) {
            return null;
        }
    },


    // ====== math-engine.js : evaluateNodeFull を書き換え ======

    evaluateNodeFull(node) {
        if (node instanceof Poly) return node;
        
        // 数値単体の場合
        if (node.type === 'number') {
            return new Poly([new Surd(new Fraction(node.value, 1, false))]);
        }

        if (node.type === 'variable') {
             const vars = {};
             vars[node.value] = 1; 
             return new Poly([new Surd(new Fraction(1), 1, vars)]);
        }

        if (node.type === 'structure') {
            if (node.subType === 'fraction') {
                // 中身を計算
                let intPart = this.calcSub(node.integer) || new Poly([new Surd(new Fraction(0))]);
                let numPart = this.calcSub(node.numerator) || new Poly([new Surd(new Fraction(1))]);
                let denPart = this.calcSub(node.denominator) || new Poly([new Surd(new Fraction(1))]);
                
                // ★追加: エラーが連鎖してきたらそのまま返す
                if (intPart.type === 'error') return intPart;
                if (numPart.type === 'error') return numPart;
                if (denPart.type === 'error') return denPart;

                // ★追加: 分母が0になっていないかチェック！
                // (Polyであり、単項式であり、係数の分子が0である場合)
                if (denPart instanceof Poly && denPart.terms.length === 1 && denPart.terms[0].coeff.n === 0) {
                    return { type: 'error', value: '分母に0は\n入りません' };
                }

                let isPureSign = node.integer && node.integer[0] && node.integer[0].isPureSign;

                // 単純な整数分の整数なら「約分なし」で作成
                if (numPart.terms.length === 1 && denPart.terms.length === 1) {
                    const tNum = numPart.terms[0];
                    const tDen = denPart.terms[0];
                    
                    if (tNum.root === 1 && tDen.root === 1 && 
                        Object.keys(tNum.vars).length === 0 && Object.keys(tDen.vars).length === 0) {
                        
                        const numVal = tNum.coeff.n * tNum.coeff.s;
                        const denVal = tDen.coeff.n * tDen.coeff.s;
                        
                        // autoReduce = false (約分禁止)
                        const rawFrac = new Fraction(numVal, denVal, false);
                        let resultPoly = new Poly([new Surd(rawFrac)]);
                        
                        if (intPart.terms.length > 0 && intPart.terms[0].coeff.n !== 0) {
                            if (isPureSign || intPart.terms[0].coeff.s < 0) return intPart.sub(resultPoly);
                            return intPart.add(resultPoly);
                        }
                        return resultPoly;
                    }
                }

                // 複雑な式（ルート入りなど）は通常の割り算（自動約分される）
                let fracPart = numPart.div(denPart);
                if (isPureSign) return new Poly([new Surd(new Fraction(0))]).sub(fracPart);
                if (intPart.terms.length>0 && intPart.terms[0].coeff.s<0) return intPart.sub(fracPart);
                return intPart.add(fracPart);
            }
            
            // ... (power, sqrt, symbol は変更なし ...
            if (node.subType === 'power') {
                let base = this.calcSub(node.base);
                let exp = this.calcSub(node.exponent);
                
                // エラー伝播
                if (base && base.type === 'error') return base;
                if (exp && exp.type === 'error') return exp;

                if (base && exp) return base.pow(exp);
            }
            if (node.subType === 'sqrt') {
                let coef = this.calcSub(node.coefficient) || new Poly([new Surd(new Fraction(1))]);
                let cont = this.calcSub(node.content);
                
                // エラー伝播
                if (coef.type === 'error') return coef;
                if (cont && cont.type === 'error') return cont;

                if (cont) {
                    if (cont.terms.length===1 && cont.terms[0].root===1 && cont.terms[0].coeff.d===1) {
                        const val = cont.terms[0].coeff.valueOf();
                        if (val > 0) return coef.mul(new Poly([new Surd(new Fraction(1), val)]));
                    }
                }
            }

            if (node.subType === 'symbol') {
                let c = this.calcSub(node.content);
                if (c && c.type === 'error') return c; // エラー伝播
                
                if (c) {
                    // ★ここを修正！ 空っぽだったところにロジックを入れる
                    if (node.symbolType === 'abs') {
                         // 中身が「純粋な数字」の場合だけ処理する
                         if (c.terms.length === 1 && c.terms[0].root === 1 && Object.keys(c.terms[0].vars).length === 0) {
                             const val = c.terms[0].coeff.valueOf();
                             if (val < 0) {
                                 // マイナスなら反転！
                                 return c.mul(new Poly([new Surd(new Fraction(-1))]));
                             }
                         }
                         // 変数(|x|)の場合は、Polyでは表現しきれないので
                         // 現状はそのまま(x)として返すか、あるいはここで処理を止めるかだけど、
                         // 算数モード(数値計算)ならこれでバッチリ動くわ！
                    }
                    return c;
                }
            }
        }
        return null;
    },

    calcSub(nodes) {
        if (!nodes || nodes.length === 0) return null;
        if (nodes.length === 1) return this.evaluateNodeFull(nodes[0]);
        return this.calculate(nodes); 
    },

    nodesToString(nodes) {
        return nodes.map(n => {
            if (n instanceof Poly) return `[${n.toString()}]`;
            if (n.type === 'operator') return ` ${n.value} `;
            if (n.type === 'structure') return `{${n.subType}}`;
            if (n.type === 'number') return n.value;
            return '?';
        }).join("");
    },

    parseSlot(c, s) { const e = c.querySelector(`:scope > ${s}`) || c.querySelector(s); return e ? this.parse(Array.from(e.querySelectorAll(':scope > .math-card'))) : null; },
    identifyType(c) { 
        if(c.classList.contains('card-number'))return'number'; if(c.classList.contains('card-operator'))return'operator'; if(c.classList.contains('card-variable'))return'variable';
        if(c.classList.contains('container-root'))return'root'; if(c.classList.contains('container-fraction'))return'fraction'; if(c.classList.contains('container-sqrt'))return'sqrt';
        if(c.classList.contains('container-power'))return'power'; if(c.classList.contains('container-symbol'))return'symbol'; return'unknown';
    },
    extractValue(c) { return c.innerText; }
};