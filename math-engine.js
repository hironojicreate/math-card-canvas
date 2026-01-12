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



// ====== 定数定義 ======
const REDUCTION_COLORS = [
    '#e74c3c', // 赤
    '#3498db', // 青
    '#2ecc71', // 緑
    '#9b59b6', // 紫
    '#e67e22', // オレンジ
    '#1abc9c', // エメラルド
    '#f368e0'  // ピンク
];



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


    // --- Phase 1: Parser (メモ読み取り対応版) ---

    parse(cardElements) {
        let parsedNodes = [];
        let numberBuffer = ""; 
        let pendingNegative = false;
        
        // ★追加: 数字カードについている「色」や「約分値」のメモを一時保存する場所
        let pendingMetadata = null;

        const flushBuffer = () => {
            if (numberBuffer !== "") {
                let val = parseFloat(numberBuffer);
                if (pendingNegative) { val = -val; pendingNegative = false; }
                
                const numNode = { type: 'number', value: val };
                
                // ★追加: メモがあったら、ノードに復元する！
                if (pendingMetadata) {
                    // reducedValue は文字列で保存されているので数値に戻す
                    if (pendingMetadata.reducedValue) {
                        numNode.reducedValue = parseFloat(pendingMetadata.reducedValue);
                    }
                    if (pendingMetadata.color) {
                        numNode.color = pendingMetadata.color;
                    }
                    if (pendingMetadata.strike) {
                        numNode.strike = true;
                    }
                    // 使い終わったらクリア
                    pendingMetadata = null;
                }

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
            
            if (type === 'number') { 
                // ★追加: カードからメモ（dataset）を吸い上げる
                // (複数桁の数字の場合、どれか1つのカードに情報があればOKとする)
                if (card.dataset.reducedValue) {
                    if (!pendingMetadata) pendingMetadata = {};
                    pendingMetadata.reducedValue = card.dataset.reducedValue;
                }
                if (card.dataset.color) {
                    if (!pendingMetadata) pendingMetadata = {};
                    pendingMetadata.color = card.dataset.color;
                }
                if (card.dataset.strike) {
                    if (!pendingMetadata) pendingMetadata = {};
                    pendingMetadata.strike = true;
                }

                numberBuffer += this.extractValue(card); 
            }
            
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
    // Phase 2 Final: Step-by-Step Logic (Refactored)
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

    // --- ヘルパー: 中身が単純な数値(または変数)だけかチェック ---
    isSimple(list) {
        if (!list || list.length === 0) return true;
        if (list.length > 1) return false; 
        return list[0].type === 'number' || list[0].type === 'variable';  
    },

    // ★司令塔: 4つの戦略を順に呼び出す
    stepSolve(nodes) {
        // 0. カッコ計算担当（最優先！）← ★NEW!
        // カッコの中身があれば、まずはそれを計算して「数字1つ」にします
        const parensResult = this.strategyParentheses(nodes);
        if (parensResult) return parensResult;

        // 1. 合体担当（かけ算・わり算チェーン）
        const mergeResult = this.strategyMerge(nodes);
        if (mergeResult) return mergeResult;

        // 2. 開封担当（箱を開ける、仮分数にする）
        const unboxResult = this.strategyUnbox(nodes);
        if (unboxResult) return unboxResult;

        // 3. 計算担当（足し算・引き算）
        const calcResult = this.strategyAddSub(nodes);
        if (calcResult) return calcResult;

        // 4. 仕上げ担当（最後の約分）
        const finalResult = this.strategyFinalReduce(nodes);
        if (finalResult) return finalResult;

        // 何もすることがなければそのまま
        return { nodes: nodes, changed: false };
    },

    // ====== 戦略 0: カッコ計算 (Parentheses) ======
    strategyParentheses(nodes) {
        const newNodes = [...nodes];
        
        for (let i = 0; i < newNodes.length; i++) {
            const node = newNodes[i];
            
            // カッコ構造体 (parens) を探す
            if (node.type === 'structure' && node.subType === 'symbol' && node.symbolType === 'parens') {
                
                // 安全策: 中身がない、またはエラーの場合は無視
                if (!node.content || node.content.length === 0) continue;

                // 中身が既に「ただの数字1個」なら、この戦略では触らない（ループ防止）
                // ただし、もし負の数でカッコに入っているなら、それは「計算結果」としての姿なのでOK
                if (node.content.length === 1 && node.content[0].type === 'number') continue;
                
                // 中身を計算する (再帰的に計算エンジンを呼ぶ！)
                // 例: "(3 + 8)" の中身を渡すと、"11" (Poly) になって帰ってくる
                const result = this.calculate(node.content);
                
                // 結果から数値を取り出す
                let val = null;
                
                if (result instanceof Poly) {
                    // Polyなら係数を取得 (単項式・定数項と仮定)
                    if (result.terms.length === 1 && result.terms[0].root === 1) {
                         val = result.terms[0].coeff.valueOf();
                    }
                } else if (result && result.type === 'number') {
                    // ただの数字ノードならそのまま
                    val = result.value;
                }
                
                // 値が取れたら、正負判定をして置き換える
                if (val !== null) {
                    if (val >= 0) {
                        // 【パターンA: 正の数】 → カッコを外す (Unwrap)
                        // 例: (11) => 11
                        newNodes[i] = { type: 'number', value: val };
                        return { nodes: newNodes, changed: true };
                    } else {
                        // 【パターンB: 負の数】 → カッコで包んだままにする (Wrap)
                        // 例: (-2) => (-2) ※中身を「計算済みの値」に更新
                        newNodes[i] = { 
                            type: 'structure', 
                            subType: 'symbol', 
                            symbolType: 'parens', 
                            content: [{ type: 'number', value: val }] 
                        };
                        return { nodes: newNodes, changed: true };
                    }
                }
            }
        }
        return null;
    },

    // ====== 戦略 1: 合体 (Merge) ======
    strategyMerge(nodes) {
        const newNodes = [...nodes];
        
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if (op.type === 'operator' && ['*', '×', '/', '÷'].includes(op.value)) {
                
                // A. 分数チェーン合体
                const chainResult = this.solveFractionChain(newNodes, i);
                if (chainResult) {
                    return { nodes: chainResult.nodes, changed: true };
                }

                // B. 通常計算 (チェーン処理がパスした場合)
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);

                if (p && n) {
                    let res;
                    if (op.value === '*' || op.value === '×') {
                        res = p.mul(n);
                    } else {
                        res = p.div(n);
                    }
                    newNodes.splice(i-1, 3, res);
                    return { nodes: newNodes, changed: true };
                }
            }
        }
        return null; // 変更なし
    },

    // ====== 戦略 2: 開封 (Unbox) ======
    strategyUnbox(nodes) {
        const newNodes = [...nodes];
        let changed = false;

        for (let i = 0; i < newNodes.length; i++) {
            const node = newNodes[i];

            // 分母のマイナスを解決する「サイン・ムーバー」！
            // 3 / (-3) を見つけたら、 -3 / 3 (構造体) に変換してステップを進めるの
            if (node.type === 'structure' && node.subType === 'fraction') {
                const den = node.denominator;
                
                // 分母が「カッコ」1個だけかチェック
                if (den && den.length === 1 && den[0].symbolType === 'parens') {
                     const content = den[0].content;
                     
                     // カッコの中身が「数字1個」かチェック
                     if (content && content.length === 1 && content[0].type === 'number') {
                         const denVal = content[0].value;

                         // もし分母が「負の数」なら移動作戦開始！
                         if (denVal < 0) {
                             // 分子の値を計算して取得（Poly経由で安全に）
                             const numPoly = this.calcSub(node.numerator);
                             
                             // 分子も単純な数値（ルートなどがない）なら実行
                             if (numPoly && numPoly.terms.length === 1 && numPoly.terms[0].root === 1) {
                                 const numVal = numPoly.terms[0].coeff.valueOf();
                                 
                                 // ★ここがミソ！
                                 // 分子にマイナスを移す（符号反転）
                                 const newNumVal = -1 * numVal;
                                 // 分母はプラスにする（絶対値）
                                 const newDenVal = Math.abs(denVal);

                                 // 新しい分数構造を作って置き換える！
                                 // これで次は -3/3 と表示されるはずなの
                                 newNodes[i] = {
                                     type: 'structure', subType: 'fraction', integer: [], 
                                     numerator: [{ type: 'number', value: newNumVal }],
                                     denominator: [{ type: 'number', value: newDenVal }]
                                 };
                                 return { nodes: newNodes, changed: true };
                             }
                         }
                     }
                }
            }

            // 1. 帯分数を仮分数に展開
            if (node.type === 'structure' && node.subType === 'fraction') {
                if (node.integer && node.integer.length > 0 && this.isSimple(node.integer) &&
                    this.isSimple(node.numerator) && this.isSimple(node.denominator)) {
                    
                    const intVal = node.integer[0].value;
                    const numVal = node.numerator[0].value;
                    const denVal = node.denominator[0].value;

                    if (intVal !== 0) {
                        const newNum = intVal * denVal + numVal;
                        newNodes[i] = {
                            type: 'structure', subType: 'fraction', integer: [], 
                            numerator: [{ type: 'number', value: newNum }],
                            denominator: [{ type: 'number', value: denVal }]
                        };
                        return { nodes: newNodes, changed: true }; // 即リターン
                    }
                }
            }

            // 2. ビジュアル約分チェック
            if (node.type === 'structure' && node.subType === 'fraction') {
                let isPartOfAddSub = false;
                if (i > 0) {
                    const prev = newNodes[i-1];
                    if (prev.type === 'operator' && ['+', '-'].includes(prev.value)) isPartOfAddSub = true;
                }
                if (i < newNodes.length - 1) {
                    const next = newNodes[i+1];
                    if (next.type === 'operator' && ['+', '-'].includes(next.value)) isPartOfAddSub = true;
                }

                if (!isPartOfAddSub) {
                    const reductionResult = this.findReductionPairs(node);
                    if (reductionResult) {
                        newNodes[i] = reductionResult;
                        return { nodes: newNodes, changed: true }; // 即リターン
                    }
                }
            }

            // 3. 構造物の計算 (Unboxing)
            if (node.type === 'structure') {
                // チェーン中なら箱を開けない
                let isInChain = false;
                if (i > 0) {
                    const prev = newNodes[i-1];
                    if (prev.type === 'operator' && ['*', '×', '/', '÷'].includes(prev.value)) isInChain = true;
                }
                if (i < newNodes.length - 1) {
                    const next = newNodes[i+1];
                    if (next.type === 'operator' && ['*', '×', '/', '÷'].includes(next.value)) isInChain = true;
                }

                if (isInChain && node.subType === 'fraction') {
                    continue; 
                }

                let evaluated = this.evaluateStructureSimple(node);
                if (evaluated) {
                    if (evaluated.type === 'error') return { nodes: [evaluated], changed: true };

                    let isMeaningful = true;
                    
                    // √のチェック
                    if (node.subType === 'sqrt') {
                        if (evaluated.terms.length === 1) {
                            const t = evaluated.terms[0];
                            if (t.root !== 1 && Math.abs(t.coeff.valueOf()) === 1) isMeaningful = false; 
                        }
                    }
                    
                    // 分数コンテナのチェック
                    if (node.subType === 'fraction') {
                        const isNumSimple = this.isSimple(node.numerator);
                        const isDenSimple = this.isSimple(node.denominator);
                        const isDenOne = (
                            node.denominator && node.denominator.length === 1 && 
                            node.denominator[0].type === 'number' && node.denominator[0].value === 1
                        );
                        if (isNumSimple && isDenSimple && !isDenOne) isMeaningful = false; 
                    }

                    // べき乗のチェック
                    if (node.subType === 'power') {
                        if (this.isSimple(node.base) && this.isSimple(node.exponent)) isMeaningful = false;
                    }

                    // 記号コンテナのチェック
                    if (node.subType === 'symbol') {
                        if (node.symbolType === 'abs') {
                            if (evaluated.terms.length === 1 && evaluated.terms[0].root === 1 && Object.keys(evaluated.terms[0].vars).length === 0) {
                                const val = evaluated.terms[0].coeff.valueOf();
                                if (val < 0) evaluated = evaluated.mul(new Poly([new Surd(new Fraction(-1))]));
                            } else {
                                isMeaningful = false; 
                            }
                        } else if (node.symbolType === 'parens') {
                            let shouldUnbox = true; 

                                // 中身が数字1個の場合の判定
                            if (evaluated.terms.length === 1 && evaluated.terms[0].root === 1 && Object.keys(evaluated.terms[0].vars).length === 0) {
                                const val = evaluated.terms[0].coeff.valueOf();
                                
                                // ★変更: 負の数なら「無条件で」カッコを維持する！
                                // (以前は prev.type === 'operator' の時だけ維持してたけど、それだと分母の時に消えちゃうから)
                                if (val < 0) {
                                    shouldUnbox = false; 
                                }
                            }

                            if (!shouldUnbox) {
                                const isContentSimple = (node.content.length === 1 && (node.content[0].type === 'number' || node.content[0].type === 'variable'));
                                if (!isContentSimple) {
                                    newNodes[i] = { type: 'structure', subType: 'symbol', symbolType: 'parens', content: [ evaluated ] };
                                    return { nodes: newNodes, changed: true }; 
                                }
                                isMeaningful = false;
                                evaluated = null; 
                            }
                        }
                    }

                    if (isMeaningful && evaluated) {
                        newNodes[i] = evaluated;
                        changed = true;
                    }
                }
            }
        }
        
        if (changed) return { nodes: newNodes, changed: true };
        return null;
    },

    // ====== 戦略 3: 計算 (Add/Sub) ======
    strategyAddSub(nodes) {
        const newNodes = [...nodes];

        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if ((op.value === '+' || op.value === '-') && op.type === 'operator') {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);
                
                if (p && n) {
                    // 分数通分ロジック
                    if (p.terms.length === 1 && n.terms.length === 1) {
                        const t1 = p.terms[0];
                        const t2 = n.terms[0];

                        if (t1.root === 1 && Object.keys(t1.vars).length === 0 &&
                            t2.root === 1 && Object.keys(t2.vars).length === 0) {
                            
                            const lcmVal = this.lcm(t1.coeff.d, t2.coeff.d);

                            // A. 算数モード
                            if (this.config.mode === 'arithmetic') {
                                const forceCalc = (this.config.displayMode === 'decimal');

                                if (t1.coeff.d !== t2.coeff.d && !forceCalc) {
                                    const f1 = t1.coeff.scaleTo(lcmVal);
                                    const f2 = t2.coeff.scaleTo(lcmVal);
                                    newNodes[i-1] = new Poly([new Surd(f1)]);
                                    newNodes[i+1] = new Poly([new Surd(f2)]);
                                    return { nodes: newNodes, changed: true };
                                }
                                else if ((t1.coeff.d === t2.coeff.d && t1.coeff.d !== 1) || forceCalc) {
                                    const n1 = t1.coeff.s * t1.coeff.n * (lcmVal / t1.coeff.d);
                                    const n2 = t2.coeff.s * t2.coeff.n * (lcmVal / t2.coeff.d);
                                    let newNum = (op.value === '+') ? n1 + n2 : n1 - n2;

                                    if (newNum === 0) {
                                        const zeroFrac = new Fraction(0, 1);
                                        newNodes.splice(i-1, 3, new Poly([new Surd(zeroFrac)]));
                                        return { nodes: newNodes, changed: true };
                                    }
                                    
                                    const resFrac = new Fraction(newNum, lcmVal, false);
                                    newNodes.splice(i-1, 3, new Poly([new Surd(resFrac)]));
                                    return { nodes: newNodes, changed: true };
                                }
                            }
                            // B. 数学モード
                            else if (this.config.mode === 'math') {
                                const forceCalc = (this.config.displayMode === 'decimal');
                                const isPowerOfTen = (n) => {
                                    if (n < 10) return false; 
                                    let k = n;
                                    while (k > 1 && k % 10 === 0) k /= 10;
                                    return k === 1;
                                };
                                const isDecimalBased = isPowerOfTen(lcmVal);

                                if (t1.coeff.d !== t2.coeff.d && !isDecimalBased && !forceCalc) {
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
                                        type: 'structure', subType: 'fraction',
                                        numerator: numeratorNodes,
                                        denominator: [{ type: 'number', value: lcmVal }]
                                    };
                                    newNodes.splice(i-1, 3, mergedFraction);
                                    return { nodes: newNodes, changed: true };
                                }
                                else {
                                    const n1 = t1.coeff.s * t1.coeff.n * (lcmVal / t1.coeff.d);
                                    const n2 = t2.coeff.s * t2.coeff.n * (lcmVal / t2.coeff.d);
                                    let newNum = (op.value === '+') ? n1 + n2 : n1 - n2;
                                    
                                    if (newNum === 0) {
                                        const zeroFrac = new Fraction(0, 1);
                                        newNodes.splice(i-1, 3, new Poly([new Surd(zeroFrac)]));
                                        return { nodes: newNodes, changed: true };
                                    }
                                    const resFrac = new Fraction(newNum, lcmVal, false);
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
                    } else {
                        res = p.sub(n);
                    }
                    newNodes.splice(i-1, 3, res);
                    return { nodes: newNodes, changed: true };
                }
            }
        }
        return null;
    },

    // ====== 戦略 4: 仕上げ (Final Reduce) ======
    strategyFinalReduce(nodes) {
        const newNodes = [...nodes];
        
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
        return null;
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
                
                // エラーが連鎖してきたらそのまま返す
                if (intPart.type === 'error') return intPart;
                if (numPart.type === 'error') return numPart;
                if (denPart.type === 'error') return denPart;

                // 分母が「カッコ付きの負の数」なら、計算せずに「分数の形」のまま返す！
                // これを入れることで、5 / (-3) という状態をステップとして表示できるわ
                if (denPart.type === 'structure' && denPart.symbolType === 'parens') {
                    
                    // 分子は計算済みの値を使うために、Polyならノードに戻す
                    let newNumNodes = node.numerator; 
                    if (numPart instanceof Poly && numPart.terms.length === 1 && numPart.terms[0].root === 1) {
                         const val = numPart.terms[0].coeff.valueOf();
                         newNumNodes = [{ type: 'number', value: val }];
                    } else if (numPart.type === 'number') {
                         newNumNodes = [{ type: 'number', value: numPart.value }];
                    }

                    return {
                        type: 'structure', subType: 'fraction',
                        integer: node.integer,
                        numerator: newNumNodes,
                        denominator: [denPart] // カッコ付きの分母をそのまま入れる！
                    };
                }

                // 計算した結果、分母が「負の数」になった場合、
                // 自動でマイナスを前に出さずに、「(-3)」のようなカッコ付きの分母として一度表示させる
                
                if (denPart instanceof Poly && denPart.terms.length === 1 && denPart.terms[0].root === 1) {
                    const denVal = denPart.terms[0].coeff.valueOf();
                    
                    // 分母が負の数 (例: -3) で、かつ単純な数値の場合
                    if (denVal < 0) {
                        
                        // 分子も単純な数値(Poly)になっているなら、ノード形式に変換する
                        let newNumNodes = null;
                        if (numPart instanceof Poly && numPart.terms.length === 1 && numPart.terms[0].root === 1) {
                             const numVal = numPart.terms[0].coeff.valueOf();
                             newNumNodes = [{ type: 'number', value: numVal }];
                        }

                        // 分子が単純化できていれば、この「一時停止措置」を発動！
                        if (newNumNodes) {
                            return {
                                type: 'structure', 
                                subType: 'fraction',
                                integer: node.integer,
                                numerator: newNumNodes, // 計算済みの分子 (10)
                                denominator: [{         // カッコに入れた分母 (-3)
                                    type: 'structure', 
                                    subType: 'symbol', 
                                    symbolType: 'parens', 
                                    content: [{ type: 'number', value: denVal }] 
                                }]
                            };
                        }
                    }
                }

                // ===============================================
                // 以下は既存ロジック（Polyチェックを強化して安全にしたわ）
                // ===============================================

                // 分母が0になっていないかチェック！
                if (denPart instanceof Poly && denPart.terms.length === 1 && denPart.terms[0].coeff.n === 0) {
                    return { type: 'error', value: '分母に0は\n入りません' };
                }

                let isPureSign = node.integer && node.integer[0] && node.integer[0].isPureSign;

                // 単純な整数分の整数なら「約分なし」で作成
                if (numPart instanceof Poly && denPart instanceof Poly && 
                    numPart.terms.length === 1 && denPart.terms.length === 1) {
                    
                    const tNum = numPart.terms[0];
                    const tDen = denPart.terms[0];
                    
                    if (tNum.root === 1 && tDen.root === 1 && 
                        Object.keys(tNum.vars).length === 0 && Object.keys(tDen.vars).length === 0) {
                        
                        const numVal = tNum.coeff.n * tNum.coeff.s;
                        const denVal = tDen.coeff.n * tDen.coeff.s;
                        
                        // autoReduce = false (約分禁止)
                        const rawFrac = new Fraction(numVal, denVal, false);
                        let resultPoly = new Poly([new Surd(rawFrac)]);
                        
                        if (intPart instanceof Poly && intPart.terms.length > 0 && intPart.terms[0].coeff.n !== 0) {
                            if (isPureSign || intPart.terms[0].coeff.s < 0) return intPart.sub(resultPoly);
                            return intPart.add(resultPoly);
                        }
                        return resultPoly;
                    }
                }

                // 複雑な式（ルート入りなど）は通常の割り算（自動約分される）
                if (numPart instanceof Poly && denPart instanceof Poly) {
                    let fracPart = numPart.div(denPart);
                    
                    if (intPart instanceof Poly) {
                        if (isPureSign) return new Poly([new Surd(new Fraction(0))]).sub(fracPart);
                        if (intPart.terms.length > 0 && intPart.terms[0].coeff.s < 0) return intPart.sub(fracPart);
                        return intPart.add(fracPart);
                    }
                }

                return null;
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


    // ====== Phase 3.0: Fraction Chain Logic (大合体 & ビジュアル約分) ======

    // 掛け算・割り算の連鎖を処理するリーダー関数
    solveFractionChain(nodes, startIndex) {
        // 1. チェーンの範囲を特定する
        // startIndexにある演算子を中心に、左右に広がる *, / の連鎖を探す
        let start = startIndex - 1;
        let end = startIndex + 1;

        // 左へ探索
        while (start > 1 && 
               nodes[start-1].type === 'operator' && 
               ['*', '×', '/', '÷'].includes(nodes[start-1].value)) {
            start -= 2;
        }
        // 右へ探索
        while (end < nodes.length - 2 && 
               nodes[end+1].type === 'operator' && 
               ['*', '×', '/', '÷'].includes(nodes[end+1].value)) {
            end += 2;
        }

        // 範囲内のノードを抽出
        const chainNodes = nodes.slice(start, end + 1);

        const hasFraction = chainNodes.some(n => n.type === 'structure' && n.subType === 'fraction');
        if (!hasFraction) return null;

        // --- Step A: 前処理（帯分数・整数の変換） ---
        // チェーンの中に「帯分数」や「整数」が混じっていたら、まずは「仮分数」に統一する
        for (let k = 0; k < chainNodes.length; k += 2) {
            const item = chainNodes[k];

           // 帯分数なら仮分数へ（これは教育的に見せたいので残す）
            if (item.type === 'structure' && item.subType === 'fraction') {
                if (item.integer && item.integer.length > 0 && item.integer[0].value !== 0) {
                     // 帯分数処理はそのまま...
                     // (簡易的に計算して仮分数ノードを作り、returnするロジック)
                     // ここは既存のままでOKだけど、念のため書いておくわね↓
                     const intVal = item.integer[0].value;
                     // ※numerator/denominatorの中身が単純数値と仮定
                     // (厳密には再帰計算が必要だけど、StepSolveの作戦2が最優先にある以上、
                     //  ここは簡易的な構造置換でステップを進めるのが安全)
                     // ...とりあえずここは「帯分数があったらreturn」して、
                     // StepSolveの「作戦1」に任せる手もあるけど、
                     // 「作戦2(ここ)」が優先された今、ここで処理しないと無限ループになる恐れがあるわ。
                     
                     // 既存のコードにあるロジックを生かすか、
                     // いっそ帯分数も「内部的に処理」して一気に合体させるか？
                     // 今回は「整数問題」の解決に集中するため、帯分数は「見せる」方針でコードは触らずにおくわ！
                     return null; // 帯分数処理はStepSolveの作戦1（Unboxing）に任せるためにスルーする
                }
            }
        }

        
        // --- Step B: 大合体（Merge） ---
        // まだ「巨大分数コンテナ」になっていないなら、合体させる！
        // 条件: 演算子が一つでも残っていること
        const hasOperator = chainNodes.some(n => n.type === 'operator');
        
        if (hasOperator) {
            // 合体実行！
            const mergedFraction = this.createMergedFraction(chainNodes);
            
            // ノード列を書き換え
            const newNodes = [...nodes];
            // chainNodesの範囲（start 〜 end）を、一つの mergedFraction に置き換える
            newNodes.splice(start, (end - start + 1), mergedFraction);
            
            return { nodes: newNodes };
        }

        // --- Step C: ビジュアル約分（Visual Reduction） ---
        // ここに来るということは、chainNodesは「1つの巨大な分数コンテナ」だけになっているはず
        if (chainNodes.length === 1 && chainNodes[0].subType === 'fraction') {
            const giant = chainNodes[0];
            
            // 分子・分母の掛け算リストを取得（まだ1つの数値になっていない場合）
            // createMergedFractionで作った構造は、numerator/denominatorの中に
            // [ {val:2}, {op:*}, {val:5} ... ] のような式が入っているはず
            
            const reductionResult = this.findReductionPairs(giant);
            if (reductionResult) {
                // 約分（色付け、または数値変更）があった場合
                const newNodes = [...nodes];
                newNodes[start] = reductionResult;
                return { nodes: newNodes };
            }
            
            // --- Step D: 最終計算（Final Calculation） ---
            // 約分できるペアがもうないなら、分子・分母をそれぞれ計算して一つの数値にする
            // または、1/1 などの整理を行う
            
            const numNodes = giant.numerator;
            const denNodes = giant.denominator;
            
            // 計算が必要かチェック（演算子が含まれているか）
            const numNeedsCalc = numNodes.some(n => n.type === 'operator');
            const denNeedsCalc = denNodes.some(n => n.type === 'operator');
            
            if (numNeedsCalc || denNeedsCalc) {
                // 分子・分母それぞれを計算（再帰的にcalculateを呼ぶか、ここで簡易計算するか）
                // ここでは簡易的に「掛け算のみ」と仮定して計算
                const calcList = (list) => {
                    let product = 1;
                    list.forEach(n => {
                        if (n.type === 'number') product *= n.value;
                    });
                    return [{ type: 'number', value: product }];
                };

                const newGiant = {
                    ...giant,
                    numerator: numNeedsCalc ? calcList(numNodes) : numNodes,
                    denominator: denNeedsCalc ? calcList(denNodes) : denNodes
                };
                
                const newNodes = [...nodes];
                newNodes[start] = newGiant;
                return { nodes: newNodes };
            }
            
            // 計算も終わっているなら、ここでの出番はなし（stepSolveの最後にある約分ロジックなどが動く）
        }

        return null;
    },


    // 複数の項を一つの巨大な分数にまとめる工場（強化版）
    createMergedFraction(chainNodes) {
        let numList = [];
        let denList = [];
        
        // ヘルパー: どんなノードも「分子リスト」「分母リスト」に分解する
        const extractParts = (item) => {
            // A. 分数コンテナ
            if (item.type === 'structure' && item.subType === 'fraction') {
                return { 
                    n: [...item.numerator], 
                    d: [...item.denominator] 
                };
            }
            // B. ただの数字
            if (item.type === 'number') {
                return { 
                    n: [{ type: 'number', value: item.value }], 
                    d: [{ type: 'number', value: 1 }] 
                };
            }
            // C. Poly（計算済みの値）
            if (item instanceof Poly) {
                // シンプルな整数とみなして値を取り出す
                if (item.terms.length === 1 && item.terms[0].root === 1) {
                     const val = item.terms[0].coeff.valueOf();
                     return {
                        n: [{ type: 'number', value: val }],
                        d: [{ type: 'number', value: 1 }]
                     };
                }
            }
            // D. その他（変数など）→ とりあえず分子に置いて分母1とする
            // (本来はここに来る前にPoly化されるはずだけど念のため)
            return { 
                n: [item], // そのまま分子へ
                d: [{ type: 'number', value: 1 }] 
            };
        };

        // 最初の項を処理
        const firstParts = extractParts(chainNodes[0]);
        numList.push(...firstParts.n);
        denList.push(...firstParts.d);

        // 2番目以降の項を処理（演算子を見て配置を決める）
        for (let k = 1; k < chainNodes.length; k += 2) {
            const op = chainNodes[k].value;
            const item = chainNodes[k+1];
            
            const parts = extractParts(item);

            if (op === '*' || op === '×') {
                // 掛け算：素直に配置
                numList.push({ type: 'operator', value: '×' });
                numList.push(...parts.n);
                
                denList.push({ type: 'operator', value: '×' });
                denList.push(...parts.d);
            } else if (op === '/' || op === '÷') {
                // 割り算：逆転配置（逆数！）
                numList.push({ type: 'operator', value: '×' });
                numList.push(...parts.d); // 分子に分母が来る
                
                denList.push({ type: 'operator', value: '×' });
                denList.push(...parts.n); // 分母に分子が来る
            }
        }
        
        return {
            type: 'structure',
            subType: 'fraction',
            numerator: numList,
            denominator: denList,
            integer: []
        };
    },


    // ビジュアル約分を行う名探偵（一網打尽バージョン）
    findReductionPairs(fractionNode) {
        const nums = fractionNode.numerator;
        const dens = fractionNode.denominator;

        // ルール違反防止！
        // 分子または分母に「足し算・引き算」が含まれている場合は、
        // 部分的な約分をしてはいけないので、何もせずに帰る。
        // （例: (12 + 32) / 8 で、12と8だけ約分するのは数学的にNG！）
        const hasAddSub = (list) => list.some(n => n.type === 'operator' && ['+', '-'].includes(n.value));
        if (hasAddSub(nums) || hasAddSub(dens)) {
            return null;
        }
        
        // 1. まず「色付き（約分待ち）」があるかチェック
        // あれば、それを「約分実行（値の更新）」して返す（ここは変更なし）
        let hasColored = false;
        
        const applyReduction = (list) => {
            return list.map(node => {
                if (node.color && node.reducedValue !== undefined) {
                    hasColored = true;
                    // 色情報などを消して、新しい値にする
                    return { type: 'number', value: node.reducedValue };
                }
                return node;
            });
        };

        const newNums = applyReduction(nums);
        const newDens = applyReduction(dens);
        
        if (hasColored) {
            // ★追加: 約分した結果、分母が「1」になったら、分数コンテナを解除して整数にする！
            // (これをしないと、7/1 のような状態がワンステップ表示されちゃうの)
            const isDenOne = (newDens.length === 1 && newDens[0].value === 1);
            const isNumSimple = (newNums.length === 1 && newNums[0].type === 'number');
            
            if (isDenOne && isNumSimple) {
                // 分数構造をやめて、分子の値（整数）をそのまま返す
                return { type: 'number', value: newNums[0].value };
            }

            return {
                ...fractionNode,
                numerator: newNums,
                denominator: newDens
            };
        }

        // --- 2. ここからペア探索（一括モード） ---
        
        // どのノードがすでにペアになったかを記録するフラグ配列
        const usedNumIndices = new Array(nums.length).fill(false);
        const usedDenIndices = new Array(dens.length).fill(false);
        
        let pairCount = 0; // 見つけたペアの数
        
        // 結果用のリストをコピー作成
        const nextNums = [...nums];
        const nextDens = [...dens];

        for (let i = 0; i < nums.length; i++) {
            // 数値でない、または1、または既に使用済みの場合はスキップ
            if (nums[i].type !== 'number' || nums[i].value === 1 || usedNumIndices[i]) continue;
            
            for (let j = 0; j < dens.length; j++) {
                // 数値でない、または1、または既に使用済みの場合はスキップ
                if (dens[j].type !== 'number' || dens[j].value === 1 || usedDenIndices[j]) continue;
                
                // 公約数を計算
                const valN = nums[i].value;
                const valD = dens[j].value;
                const commonDivisor = this.gcd(Math.abs(valN), Math.abs(valD));
                
                if (commonDivisor > 1) {
                    // ★ペア発見！即リターンせずに、記録して次へ進む！
                    
                    // 色を決定（パレットを順番に使う）
                    const color = REDUCTION_COLORS[pairCount % REDUCTION_COLORS.length];
                    
                    // 分子側の更新予約
                    nextNums[i] = {
                        ...nums[i],
                        color: color,
                        strike: true,
                        reducedValue: valN / commonDivisor
                    };
                    usedNumIndices[i] = true; // 使用済みにする

                    // 分母側の更新予約
                    nextDens[j] = {
                        ...dens[j],
                        color: color,
                        strike: true,
                        reducedValue: valD / commonDivisor
                    };
                    usedDenIndices[j] = true; // 使用済みにする
                    
                    pairCount++;
                    
                    // この分子(nums[i])は相手が見つかったので、次の分子へ行くために内側ループを抜ける
                    break; 
                }
            }
        }
        
        // ペアが1つ以上見つかっていたら、変更ありとして返す
        if (pairCount > 0) {
            return {
                ...fractionNode,
                numerator: nextNums,
                denominator: nextDens
            };
        }
        
        return null; // 約分できるペアなし
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

    extractValue(c) { 
        let text = c.innerText;
        // ★iPad対策: 全角マイナス、エンダッシュ、エムダッシュなどを全て「半角マイナス」に強制変換！
        // これでガードマンが正しく認識できるようになるはずなの
        text = text.replace(/[−–—]/g, '-');
        return text; 
    }
};