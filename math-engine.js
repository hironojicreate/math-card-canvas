// ====== Math Card Engine (計算エンジン) ======
// Phase 2.5 Complete: Fraction + Root(Surd) + Polynomial Support

// ---------------------------------------------------------
// 1. Fraction Class (有理数クラス) - 変更なし
// ---------------------------------------------------------
class Fraction {
    constructor(numerator, denominator = 1) {
        if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
            const factor = 100000; 
            numerator = Math.round(numerator * factor);
            denominator = Math.round(denominator * factor);
        }
        if (denominator === 0) { console.error("Zero Division!"); denominator = 1; }
        this.s = (numerator * denominator < 0) ? -1 : 1;
        this.n = Math.abs(numerator);
        this.d = Math.abs(denominator);
        this.on = this.n;
        this.od = this.d;
        this.reduce();
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
    // 逆数を返す
    inverse() {
        return new Fraction(this.s * this.d, this.n);
    }
    pow(expFrac) {
        // 指数が整数の場合のみ対応 (中学生レベル)
        if (expFrac.d === 1) {
            const exp = expFrac.s * expFrac.n;
            if (exp === 0) return new Fraction(1);
            if (exp > 0) return new Fraction(Math.pow(this.s * this.n, exp), Math.pow(this.d, exp));
            if (exp < 0) return new Fraction(Math.pow(this.d, -exp), Math.pow(this.s * this.n, -exp));
        }
        return new Fraction(0); // 未対応
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
// 2. Surd Class (ルート単項式クラス) ★New!
// 形式: coeff * √root * vars
// 例: 2x -> coeff=2, root=1, vars={x:1}
// 例: 3x^2y -> coeff=3, root=1, vars={x:2, y:1}
// ---------------------------------------------------------


// ====== math-engine.js : 2. Surd Class (ルート単項式クラス) を丸ごと書き換え ======

// 形式: coeff * √root * vars
// 例: 2x -> coeff=2, root=1, vars={x:1}
class Surd {
    constructor(coeff, root = 1, vars = {}) {
        this.coeff = coeff; // Fraction
        this.root = root;   // Integer
        this.vars = vars;   // Object { x: 1, y: 2 } など
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
        // 係数とルートの計算
        const newCoeff = this.coeff.mul(other.coeff);
        const newRoot = this.root * other.root;
        
        // 変数の計算 (指数法則: x^a * x^b = x^(a+b))
        const newVars = { ...this.vars }; // コピー
        for (let v in other.vars) {
            if (newVars[v]) {
                newVars[v] += other.vars[v];
            } else {
                newVars[v] = other.vars[v];
            }
        }
        return new Surd(newCoeff, newRoot, newVars);
    }
    
    // 同類項判定 (ルートの中身 AND 変数の構成 が一致するか)
    isLikeTerm(other) {
        if (this.root !== other.root) return false;
        
        // 変数のキー数チェック
        const keysA = Object.keys(this.vars).sort();
        const keysB = Object.keys(other.vars).sort();
        if (keysA.length !== keysB.length) return false;

        // 中身チェック
        for (let k of keysA) {
            if (keysB.indexOf(k) === -1) return false;
            if (this.vars[k] !== other.vars[k]) return false;
        }
        return true;
    }

    toString() {
        if (this.coeff.n === 0) return "";
        let s = "";
        
        // 変数部分の文字列作成
        let varStr = "";
        const keys = Object.keys(this.vars).sort();
        for (let k of keys) {
            const exp = this.vars[k];
            if (exp === 1) varStr += k;
            else varStr += `${k}^${exp}`;
        }

        const absCoeff = Math.abs(this.coeff.valueOf());
        const isCoeffOne = (absCoeff === 1 && this.coeff.d === 1);
        
        // マイナス処理
        if (this.coeff.s === -1) s += "-";

        // 係数を表示すべきか？
        const hasVars = varStr.length > 0;
        const hasRoot = this.root !== 1;

        if (isCoeffOne) {
            if (!hasVars && !hasRoot) {
                s += "1"; // ただの1
            }
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
// 3. Poly Class (多項式クラス) ★New!
// 複数の Surd の和として式を管理する
// 例: 2 + 3√2 -> [Surd(2,1), Surd(3,2)]
// ---------------------------------------------------------
class Poly {
    constructor(terms = []) {
        this.terms = terms; // Array of Surd
        this.collectTerms(); // 同類項をまとめる
    }

    // 同類項をまとめる (例: 2x + 3x -> 5x,  √2 + 2√2 -> 3√2)
    collectTerms() {
        if (this.terms.length <= 1) return;

        const newTerms = [];
        // ルートの中身 + 変数構成 をキーにしてグループ化
        const groups = {};
        
        for (let term of this.terms) {
            let varKey = Object.keys(term.vars).sort().map(k => `${k}${term.vars[k]}`).join("_");
            const key = `r${term.root}_v${varKey}`;

            if (!groups[key]) {
                groups[key] = {
                    baseTerm: term,
                    // ★修正: 0から足すのではなく、最初の項を「そのまま」使う！
                    // これで Fraction オブジェクトが再生成されず、on/od の記憶が保たれるわ。
                    totalCoeff: term.coeff 
                };
            } else {
                // 2つ目以降は足し合わせる（この場合は記憶が消えても仕方ない＝計算結果だから）
                groups[key].totalCoeff = groups[key].totalCoeff.add(term.coeff);
            }
        }

        // グループごとに項を再生成
        for (let key in groups) {
            const g = groups[key];
            if (g.totalCoeff.n !== 0) { // 係数が0じゃない項だけ残す
                // ベースの項から、係数だけ差し替えた新しい項を作る
                newTerms.push(new Surd(g.totalCoeff, g.baseTerm.root, { ...g.baseTerm.vars }));
            }
        }
        
        // 全部消えたら0にする
        if (newTerms.length === 0) {
            newTerms.push(new Surd(new Fraction(0), 1));
        }
        
        // 見た目が綺麗になるように、変数の次数の高い順や辞書順にソートするロジックを入れてもいいけど
        // まずは生成順（ハッシュ順）で出すわ

        this.terms = newTerms;
    }

    add(otherPoly) {
        return new Poly([...this.terms, ...otherPoly.terms]);
    }

    sub(otherPoly) {
        // 引く方の符号を反転させた項を作る
        const negatedTerms = otherPoly.terms.map(t => {
            const negCoeff = t.coeff.mul(new Fraction(-1));
            return new Surd(negCoeff, t.root);
        });
        return new Poly([...this.terms, ...negatedTerms]);
    }

    mul(otherPoly) {
        // 分配法則 (総当たり)
        const newTerms = [];
        for (let t1 of this.terms) {
            for (let t2 of otherPoly.terms) {
                newTerms.push(t1.mul(t2));
            }
        }
        return new Poly(newTerms);
    }
    
    // 中学生レベルでは多項式の割り算は難しいので、
    // 「全体が単項式（項が1つ）」の場合のみ割り算可能とする簡易実装
    div(otherPoly) {
        if (this.terms.length === 1 && otherPoly.terms.length === 1) {
             const t1 = this.terms[0];
             const t2 = otherPoly.terms[0];
             // (a√b) / (c√d) = (a/c) * √(b/d) -> これは難しい
             // 中学生ルール: 分母を有理化できる形ならやるが...
             // ここでは「有理数の割り算」のみ完璧に対応し、ルート同士は「割り切れるなら」対応する
             
             // 係数の割り算
             const newCoeff = t1.coeff.div(t2.coeff);
             
             // ルートの中身: 割り切れるか？ (√6 / √2 = √3)
             if (t1.root % t2.root === 0) {
                 return new Poly([new Surd(newCoeff, t1.root / t2.root)]);
             }
             // 割り切れない場合、分数の中にルートが残るが...今のSurd構造では表現しきれない
             // 暫定対応: 近似値にして返すか、エラーにするか。
             // 今回は「係数だけ割って、ルートはそのまま」にする (√2 / 2 -> 1/2√2)
             // ただし分母にルートがある場合は未対応
             if (t2.root === 1) {
                 return new Poly([new Surd(newCoeff, t1.root)]);
             }
        }
        // 未対応
        console.warn("Complex division not supported yet");
        return this; // とりあえず自分を返す
    }
    
    // べき乗 (整数乗のみ)
    pow(expPoly) {
        // 指数が「単項式の整数」であることを確認
        if (expPoly.terms.length === 1 && expPoly.terms[0].root === 1 && expPoly.terms[0].coeff.d === 1) {
             const exp = expPoly.terms[0].coeff.valueOf();
             if (exp === 0) return new Poly([new Surd(new Fraction(1))]);
             if (exp === 1) return this;
             
             // 愚直に掛け算する (2乗、3乗くらいならこれでOK)
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
        // 項をつなげて文字列にする
        let s = "";
        this.terms.forEach((term, index) => {
            const termStr = term.toString();
            if (termStr === "") return; // 係数0

            if (index === 0) {
                s += termStr;
            } else {
                // 2項目以降は符号を見る
                if (term.coeff.s >= 0) {
                    s += " + " + termStr;
                } else {
                    s += " - " + termStr.replace("-", ""); // マイナスを取ってつける
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
    config: { mode: 'arithmetic' },

    init() {
        console.log("Math Engine: Ready! (Step-by-Step Mode 🌰)");
    },

    // --- Phase 1: Parser (変更なし) ---

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

        // ★ここを大改造！: 暗黙の掛け算チェック & 「係数合体」ロジック
        const checkImplicit = (curr) => {
            if (parsedNodes.length === 0) return;
            const prev = parsedNodes[parsedNodes.length - 1];
            
            // パターンA: 数字(Number) のあとに 変数(Variable) が来た！
            // -> [2, x] を [*] で繋ぐのではなく、[Poly(2x)] に合体させる！
            if (prev.type === 'number' && curr.type === 'variable') {
                // 前の数字を取り消す
                parsedNodes.pop();
                
                // Poly(係数*変数) を作って入れる
                const vars = {};
                vars[curr.value] = 1;
                // 係数は prev.value
                const polyNode = new Poly([new Surd(new Fraction(prev.value), 1, vars)]);
                
                parsedNodes.push(polyNode);
                
                // curr（今の変数ノード）はもう使わないので、呼び出し元で追加されないようにする工夫が必要だけど
                // 配列操作しちゃってるから、currを「無効」にするフラグを立てるか、
                // あるいは呼び出し元で `parsedNodes.push(curr)` するのを防ぐ必要があるわね。
                
                // ★トリック: currのタイプを 'merged' に変えて、呼び出し元で無視させる！
                curr.type = 'merged'; 
                return;
            }

            // パターンB: 従来通りの暗黙の掛け算 (例: 2(x+1) など)
            const pT = (prev.type==='number'||prev.type==='structure'||prev.type==='variable'||prev instanceof Poly);
            const cT = (curr.type==='structure'||curr.type==='variable'||curr instanceof Poly);
            
            if ((prev.type==='number' && curr.type==='structure') || (pT && cT)) {
                 parsedNodes.push({ type: 'operator', value: '*' });
            }
        };

        cardElements.forEach(card => {
            const type = this.identifyType(card);
            
            // ... (コンテナ系の処理はそのまま) ...
            if (['root', 'fraction', 'sqrt', 'power', 'symbol'].includes(type)) {
                flushBuffer();
                if (pendingNegative) {
                    const m1 = { type: 'number', value: -1 };
                    checkImplicit(m1); parsedNodes.push(m1); pendingNegative = false;
                }
                
                let sn = { type: 'structure', subType: type, children: [] };
                // ... (中身のパース処理は既存のまま) ...
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
                
                // ★追加: もし checkImplicit で合体(merged)されていたら、pushしない！
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
    // Phase 2 Final: Step-by-Step Logic (指揮官と現場監督)
    // =========================================================

    // ★指揮官: 計算が終わるまでステップを回して、履歴を表示する
    calculate(nodes) {
        if (!nodes || nodes.length === 0) return null;
        console.log("Input Formula:", this.nodesToString(nodes));

        let currentNodes = nodes;
        let stepCount = 1;
        
        // 最大10ステップまで（無限ループ防止）
        while (stepCount <= 10) {
            // 次のステップを計算してみる
            const nextResult = this.stepSolve(currentNodes);
            
            // もし何も変わらなければ、計算終了
            if (!nextResult.changed) {
                // 最終結果がPolyオブジェクトなら文字列にして返す
                if (currentNodes.length === 1 && currentNodes[0] instanceof Poly) {
                    return currentNodes[0];
                }
                // まだリストなら、無理やりまとめてみる（本来はここで終了）
                return currentNodes[0]; 
            }

            // 変化があったらログに出す！
            currentNodes = nextResult.nodes;
            const stepStr = this.nodesToString(currentNodes);
            console.log(`[Step ${stepCount}] ->`, stepStr); // ★ここがアニメーションの素！
            
            stepCount++;
        }

        return currentNodes[0];
    },

    // ★現場監督: 式全体を見て、1回だけ計算を進める



    // ★修正版: 現場監督 (数字もちゃんと計算できるように改良！)

    // ====== math-engine.js : MathEngine.stepSolve を書き換え ======

    stepSolve(nodes) {
        let newNodes = [...nodes];
        let changed = false;
        
        // -----------------------------------------------------
        // 作戦1: 「構造物の計算」 (Unboxing)
        // ここでは「見た目が変わるような大きな変化」だけを感知するわ！
        // -----------------------------------------------------
        for (let i = 0; i < newNodes.length; i++) {
            const node = newNodes[i];
            if (node.type === 'structure') {
                const evaluated = this.evaluateStructureSimple(node);
                if (evaluated) {
                    // ★空気を読む判定ロジック★
                    let isMeaningful = true;

                    // √コンテナの場合
                    if (node.subType === 'sqrt') {
                        // 結果が「係数1のルート単項式」のままなら、見た目は変わってないとみなす
                        // (例: √3 -> 1√3 ... これは変化なし扱い)
                        if (evaluated.terms.length === 1) {
                            const t = evaluated.terms[0];
                            // ルートが残っていて(root!=1)、かつ係数が1なら「変化なし」
                            if (t.root !== 1 && Math.abs(t.coeff.valueOf()) === 1) {
                                isMeaningful = false; 
                            }
                        }
                    }
                    
                    // データは更新する（計算できるようにするため）
                    newNodes[i] = evaluated;
                    
                    // 「劇的な変化」があった時だけ、changedフラグを立てる
                    if (isMeaningful) {
                        changed = true;
                    }
                    // ★重要: ここで return せず、下の計算に進む！
                    // これにより、2*√3 などが同じステップで計算されるの。
                }
            }
        }

        // -----------------------------------------------------
        // 作戦2: 掛け算・割り算 (*, /)
        // -----------------------------------------------------
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if (op.type === 'operator' && ['*', '×', '/', '÷'].includes(op.value)) {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);

                if (p && n) {
                    let res;
                    if (op.value === '*' || op.value === '×') res = p.mul(n);
                    else res = p.div(n);
                    
                    newNodes.splice(i-1, 3, res); 
                    i = i - 1; 
                    changed = true;
                }
            }
        }

        if (changed) {
            return { nodes: newNodes, changed: true };
        }

        // -----------------------------------------------------
        // 作戦3: 足し算・引き算 (+, -)
        // -----------------------------------------------------
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if ((op.value === '+' || op.value === '-') && op.type === 'operator') {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                
                const p = this.ensurePoly(prev);
                const n = this.ensurePoly(next);
                
                if (p && n) {
                    let res;
                    if (op.value === '+') res = p.add(n);
                    else res = p.sub(n);
                    
                    newNodes.splice(i-1, 3, res);
                    return { nodes: newNodes, changed: true };
                }
            }
        }

        return { nodes: newNodes, changed: false };
    },

    // ★追加: ノードがただの数字ならPolyに変換して返すヘルパー


    ensurePoly(node) {
        if (node instanceof Poly) return node;
        
        // 数字の場合
        if (node.type === 'number') {
            return new Poly([new Surd(new Fraction(node.value), 1)]);
        }
        
        // ★ここが大事！変数の場合を追加
        if (node.type === 'variable') {
            // 係数1, ルート1, 変数{x:1} の項を作る
            const vars = {};
            vars[node.value] = 1; 
            return new Poly([new Surd(new Fraction(1), 1, vars)]);
        }

        return null;
    },

    // 構造体ノードをチェックし、計算可能ならPolyにして返すヘルパー
    evaluateStructureSimple(node) {
        // すでにPolyなら何もしない
        if (node instanceof Poly) return null;
        if (node.type === 'number') return new Poly([new Surd(new Fraction(node.value), 1)]);
        
        // ここで「中身を再帰的に計算」して、Polyにできるか試す
        // 今回はロジックを簡略化して、「evaluateNode (前回作った関数)」を再利用するわ！
        // evaluateNodeは「計算できるものは全部Polyにする」やつだったわよね。
        
        try {
            // 中身がまだ演算子を含んでいる場合は、evaluateNodeはエラーになるか、変な挙動をするかも。
            // でも今のカードの仕組み上、スロット内は独立しているから大丈夫。
            // ★ここが「2^3」や「√16」を「8」「4」に変える魔法の場所よ！
            const result = this.evaluateNodeFull(node);
            
            // 結果がPolyで、かつ「中身が変わった（計算が進んだ）」なら返す
            return result;
        } catch (e) {
            return null; // まだ計算できない
        }
    },

    // (一発でPolyにする関数)
    evaluateNodeFull(node) {
        if (node instanceof Poly) return node;
        if (node.type === 'number') return new Poly([new Surd(new Fraction(node.value), 1)]);

        // 変数(variable)の場合 (これを忘れていたの！)
        if (node.type === 'variable') {
             const vars = {};
             vars[node.value] = 1; 
             return new Poly([new Surd(new Fraction(1), 1, vars)]);
        }

        if (node.type === 'structure') {
            // Fraction
            if (node.subType === 'fraction') {
                // 中身を再帰的にPolyへ
                let intPart = this.calcSub(node.integer) || new Poly([new Surd(new Fraction(0))]);
                let numPart = this.calcSub(node.numerator) || new Poly([new Surd(new Fraction(1))]);
                let denPart = this.calcSub(node.denominator) || new Poly([new Surd(new Fraction(1))]);
                let isPureSign = node.integer && node.integer[0] && node.integer[0].isPureSign;

                let fracPart = numPart.div(denPart);
                if (isPureSign) return new Poly([new Surd(new Fraction(0))]).sub(fracPart);
                if (intPart.terms.length>0 && intPart.terms[0].coeff.s<0) return intPart.sub(fracPart);
                return intPart.add(fracPart);
            }
            // Power
            if (node.subType === 'power') {
                let base = this.calcSub(node.base);
                let exp = this.calcSub(node.exponent);
                if (base && exp) return base.pow(exp);
            }
            // Sqrt
            if (node.subType === 'sqrt') {
                let coef = this.calcSub(node.coefficient) || new Poly([new Surd(new Fraction(1))]);
                let cont = this.calcSub(node.content);
                if (cont) {
                    if (cont.terms.length===1 && cont.terms[0].root===1 && cont.terms[0].coeff.d===1) {
                        const val = cont.terms[0].coeff.valueOf();
                        if (val > 0) return coef.mul(new Poly([new Surd(new Fraction(1), val)]));
                    }
                }
            }
            // Parens
            if (node.subType === 'symbol') {
                let c = this.calcSub(node.content);
                if (c) {
                     if (node.symbolType === 'abs') { /* 絶対値処理略 */ }
                     return c;
                }
            }
        }
        return null;
    },
    // スロットの中身（配列）をPolyに変換するヘルパー
    calcSub(nodes) {
        if (!nodes || nodes.length === 0) return null;
        // 再帰的に calculate を呼ぶとログが出ちゃうので、内部計算用の軽量版が本当は欲しいけど
        // 今は単純に evaluateNodeFull に投げるわ
        // (注: スロット内に "1+2" みたいな式が入っている場合は、本当はここで再帰calculateが必要)
        // 今回のテストケース（2^3, √16）はスロット内が数字だけなのでこれで動くわ
        if (nodes.length === 1) return this.evaluateNodeFull(nodes[0]);
        // 式が入っている場合は...今の構造だとまだ未対応だけど、Level 7まではこれでいける！
        return this.calculate(nodes); // 再帰しちゃう！
    },

    // ログ表示用: ノードリストを文字列にする
    nodesToString(nodes) {
        return nodes.map(n => {
            if (n instanceof Poly) return `[${n.toString()}]`;
            if (n.type === 'operator') return ` ${n.value} `;
            if (n.type === 'structure') return `{${n.subType}}`;
            if (n.type === 'number') return n.value;
            return '?';
        }).join("");
    },

    // --- ヘルパー群 (変更なし) ---
    parseSlot(c, s) { const e = c.querySelector(`:scope > ${s}`) || c.querySelector(s); return e ? this.parse(Array.from(e.querySelectorAll(':scope > .math-card'))) : null; },
    identifyType(c) { 
        if(c.classList.contains('card-number'))return'number'; if(c.classList.contains('card-operator'))return'operator'; if(c.classList.contains('card-variable'))return'variable';
        if(c.classList.contains('container-root'))return'root'; if(c.classList.contains('container-fraction'))return'fraction'; if(c.classList.contains('container-sqrt'))return'sqrt';
        if(c.classList.contains('container-power'))return'power'; if(c.classList.contains('container-symbol'))return'symbol'; return'unknown';
    },
    extractValue(c) { return c.innerText; }
};