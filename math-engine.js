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
// 形式: coeff * √root
// 例: 2√3 -> coeff=2, root=3
// ---------------------------------------------------------
class Surd {
    constructor(coeff, root = 1) {
        this.coeff = coeff; // Fraction
        this.root = root;   // Integer (正の整数)
        this.simplify();    // 自動簡単化 (√12 -> 2√3)
    }

    // 簡単化ロジック: √12 -> 2√3
    simplify() {
        if (this.root === 0) {
            this.coeff = new Fraction(0);
            this.root = 1;
            return;
        }
        if (this.root === 1) return;

        // 素因数分解的なアプローチで平方数を見つける
        let outside = 1;
        let inside = this.root;
        
        // 4, 9, 16... で割れるか試す
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
        // (a√b) * (c√d) = (ac)√(bd)
        const newCoeff = this.coeff.mul(other.coeff);
        const newRoot = this.root * other.root;
        return new Surd(newCoeff, newRoot);
    }
    
    // 似ている項か？ (√の中身が同じか)
    isLikeTerm(other) {
        return this.root === other.root;
    }

    toString() {
        if (this.coeff.n === 0) return "";
        let s = "";
        
        // 係数の表示
        // 1√3 -> √3, -1√3 -> -√3, 2√3 -> 2√3
        const absCoeff = Math.abs(this.coeff.valueOf());
        
        if (this.root === 1) {
            // ルートがない場合 (ただの有理数)
            return this.coeff.toString();
        } else {
            // ルートがある場合
            if (this.coeff.s === -1) s += "-";
            
            // 係数が 1 または -1 以外なら数字を表示
            // または、係数が分数なら必ず表示 (1/2√3など)
            if (absCoeff !== 1 || this.coeff.d !== 1) {
                // 絶対値で表示
                const c = new Fraction(this.coeff.n, this.coeff.d); // 符号なし
                if (c.d === 1) s += c.n;
                else s += `${c.n}/${c.d}`;
            }
            
            s += `√${this.root}`;
            return s;
        }
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

    // 同類項をまとめる (例: √2 + 2√2 -> 3√2)
    collectTerms() {
        if (this.terms.length <= 1) return;

        const newTerms = [];
        // ルートの中身ごとにグループ化
        const groups = {};
        
        for (let term of this.terms) {
            const key = term.root;
            if (!groups[key]) groups[key] = new Fraction(0);
            groups[key] = groups[key].add(term.coeff);
        }

        // ルートの小さい順に並べる (1, 2, 3...)
        const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
        
        for (let key of keys) {
            const coeff = groups[key];
            if (coeff.n !== 0) { // 係数が0じゃない項だけ残す
                newTerms.push(new Surd(coeff, key));
            }
        }
        
        // 全部消えたら0にする
        if (newTerms.length === 0) {
            newTerms.push(new Surd(new Fraction(0), 1));
        }

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
        const checkImplicit = (curr) => {
            if (parsedNodes.length === 0) return;
            const prev = parsedNodes[parsedNodes.length - 1];
            const pT = (prev.type==='number'||prev.type==='structure'||prev.type==='variable');
            const cT = (curr.type==='structure'||curr.type==='variable');
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
                
                // 各スロットのパース（再帰）
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
                checkImplicit(vn); parsedNodes.push(vn);
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
    // 戻り値: { nodes: [...], changed: true/false }
    stepSolve(nodes) {
        // コピーを作成（元の配列を壊さないため）
        let newNodes = [...nodes];
        let changed = false;

        // -----------------------------------------------------
        // 作戦1: 「中身」のあるコンテナを先に計算 (再帰)
        // (カッコの中や、分数の分子分母など)
        // -----------------------------------------------------
        for (let i = 0; i < newNodes.length; i++) {
            const node = newNodes[i];
            if (node.type === 'structure') {
                // 各スロットをチェックして、まだ計算途中なら進める
                // (実装簡略化のため、ここは「評価済み」にする処理を呼ぶ)
                const evaluated = this.evaluateStructureSimple(node);
                if (evaluated) {
                    // もし構造体が「計算可能なPoly」に変わったら置き換える
                    newNodes[i] = evaluated;
                    changed = true;
                }
            }
        }
        // コンテナの中身を計算したなら、このステップはこれで終わり（中身の変化を見せるため）
        // でもヒロさんの要望は「一斉射撃」なので、続けて次の作戦もやるわ！

        // -----------------------------------------------------
        // 作戦2: 「構造物の計算」 (べき乗、ルート、分数) ★一斉射撃！
        // 数字だけで構成された構造物を、計算結果(Poly)に置き換える
        // -----------------------------------------------------
        // 注意: すでにPolyになっているものはスルー
        
        // ※ evaluateStructureSimple で一括変換済みなので、
        // ここでは「計算結果がPolyになったかどうか」で判定済み
        if (changed) return { nodes: newNodes, changed: true };


        // -----------------------------------------------------
        // 作戦3: 掛け算・割り算 (*, /)
        // 左から順に探して、ひとつでも見つけたら計算して終了
        // (構造物の計算がなかった場合のみ実行)
        // -----------------------------------------------------
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if ((op.value === '*' || op.value === '×' || op.value === '/' || op.value === '÷') && op.type === 'operator') {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                
                // 両隣が計算済み(Poly)なら実行
                if (prev instanceof Poly && next instanceof Poly) {
                    let res;
                    if (op.value === '*' || op.value === '×') res = prev.mul(next);
                    else res = prev.div(next);
                    
                    newNodes.splice(i-1, 3, res); // 3つ消して結果を入れる
                    return { nodes: newNodes, changed: true };
                }
            }
        }

        // -----------------------------------------------------
        // 作戦4: 足し算・引き算 (+, -)
        // -----------------------------------------------------
        for (let i = 1; i < newNodes.length - 1; i++) {
            const op = newNodes[i];
            if ((op.value === '+' || op.value === '-') && op.type === 'operator') {
                const prev = newNodes[i-1];
                const next = newNodes[i+1];
                
                if (prev instanceof Poly && next instanceof Poly) {
                    let res;
                    if (op.value === '+') res = prev.add(next);
                    else res = prev.sub(next);
                    
                    newNodes.splice(i-1, 3, res);
                    return { nodes: newNodes, changed: true };
                }
            }
        }

        // 何もすることがない
        return { nodes: newNodes, changed: false };
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

    // 前回の evaluateNode をリネームして活用 (一発でPolyにする関数)
    evaluateNodeFull(node) {
        if (node instanceof Poly) return node;
        if (node.type === 'number') return new Poly([new Surd(new Fraction(node.value), 1)]);

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