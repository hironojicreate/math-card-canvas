// ====== 設定と定数 ======
const FIELD_ID = 'calc-field';
const WAIT_AREA_ID = 'wait-area';

// ====== カードクラス ======
class MathCard {
    constructor(type, value, x, y) {
        this.type = type;   
        this.value = value; 
        this.x = x;
        this.y = y;
        this.element = this.createDOM();
        
        this.element.dataset.instanceId = Math.random().toString(36).substring(7);
        this.lastClickTime = 0;
        this.addDragSupport();
    }

// ====== 1. createDOM の書き換え（ハンドル生成を削除） ======
createDOM() {
    const el = document.createElement('div');
    el.classList.add('math-card');

    // ★ハンドルフラグ(needsHandle)とその処理は全削除！

    // タイプ別のスタイルと構造（ここは以前のまま）
    if (this.type === 'root') {
        el.classList.add('container-root');
        
        // ★変更点：ラベル生成コードを削除しました！
        // const label = document.createElement('div');
        // label.className = 'root-label';
        // label.innerText = '式';
        // el.appendChild(label);
        
        // シンプルにスロットだけを追加
        const slot = document.createElement('div');
        slot.className = 'card-slot root-slot'; 
        el.appendChild(slot);

    } else if (this.type === 'power') {
        el.classList.add('container-power');
        const baseSlot = document.createElement('div');
        baseSlot.className = 'card-slot base-slot';
        el.appendChild(baseSlot);
        const expSlot = document.createElement('div');
        expSlot.className = 'card-slot exponent-slot';
        el.appendChild(expSlot);
        
    } else if (this.value === '分数') {
        el.classList.add('container-fraction');
        const intSlot = document.createElement('div');
        intSlot.className = 'card-slot integer-part';
        el.appendChild(intSlot);

        const fracPart = document.createElement('div');
        fracPart.className = 'fraction-part'; 

        const numSlot = document.createElement('div');
        numSlot.className = 'card-slot numerator';
        fracPart.appendChild(numSlot);

        const line = document.createElement('div');
        line.className = 'fraction-line';
        fracPart.appendChild(line);

        const denSlot = document.createElement('div');
        denSlot.className = 'card-slot denominator';
        fracPart.appendChild(denSlot);

        el.appendChild(fracPart);

    } else if (this.value === '√') {
        el.classList.add('container-symbol');
        el.classList.add('container-sqrt'); 

        const coeffSlot = document.createElement('div');
        coeffSlot.className = 'card-slot coefficient-part';
        el.appendChild(coeffSlot);

        const sym = document.createElement('div');
        sym.className = 'symbol-sqrt-svg';
        sym.innerHTML = `
        <svg viewBox="0 0 15 35" preserveAspectRatio="none" style="width:100%; height:100%; display:block;">
            <path d="M2 20 L6 32 L15 1" fill="none" stroke="#333" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        `;
        el.appendChild(sym);

        const slot = document.createElement('div');
        slot.className = 'card-slot sqrt-border-top'; 
        el.appendChild(slot);

    } else if (this.value === '( )') {
        el.classList.add('container-symbol');
        const leftSym = document.createElement('div');
        leftSym.className = 'symbol-char';
        leftSym.innerText = '(';
        el.appendChild(leftSym);
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        el.appendChild(slot);
        const rightSym = document.createElement('div');
        rightSym.className = 'symbol-char';
        rightSym.innerText = ')';
        el.appendChild(rightSym);

    } else if (this.value === '|x|') {
        el.classList.add('container-symbol');
        const leftSym = document.createElement('div');
        leftSym.className = 'symbol-char';
        leftSym.innerText = '|';
        el.appendChild(leftSym);
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        el.appendChild(slot);
        const rightSym = document.createElement('div');
        rightSym.className = 'symbol-char';
        rightSym.innerText = '|';
        el.appendChild(rightSym);
        
    } else {

        // 数字・記号・変数
            if (this.type === 'number') el.classList.add('card-number');
            
            // ★ここを書き換え
            else if (this.type === 'operator') {
                el.classList.add('card-operator');
                
                // 特例：「あまり」という文字なら、横長クラスを追加！
                if (this.value === 'あまり') {
                    el.classList.add('card-remainder');
                    el.innerText = this.value;
                }

                else if (this.value === '-') {
                    el.classList.add('visual-minus');
                    // 文字だけを操作するために span で囲む
                    el.innerHTML = '<span class="minus-content">-</span>';
                } else {
                    // それ以外は通常通り
                    el.innerText = this.value;
                }
            }
            
            else if (this.type === 'variable') el.classList.add('card-variable');
            
            if (this.type === 'variable' || this.type === 'number') {
                el.innerText = this.value;
            }
    }


    // ★ここに追加
        if (this.type === 'error') {
            el.classList.add('card-error');
            el.innerText = this.value; // "0では\nわれません"
        }

    // ★ハンドル追加コードは削除済み

    el.style.left = `${this.x}px`;
    el.style.top = `${this.y}px`;

    return el;
}

    // ★追加機能：値を更新する（1→12→125と増やすため）
    updateValue(newValue) {
        this.value = newValue;
        this.element.innerText = newValue;
    }

 // ====== script.js : MathCard クラスの addDragSupport メソッド内 ======

    addDragSupport() {
        const el = this.element;
        
        // --- A. ホバー時のスマート選択ロジック ---
        el.addEventListener('mouseover', (e) => {
            if (App.dragState.isDragging) return;
            e.stopPropagation();
            el.classList.add('hover-active');
        });

        el.addEventListener('mouseout', (e) => {
            if (App.dragState.isDragging) return;
            e.stopPropagation();
            el.classList.remove('hover-active');
        });

        // --- B. ドラッグ開始 兼 クリックフォーカス判定 ---

        const handleStart = (e) => {
            // 右クリックは無視
            if (e.type === 'mousedown' && e.button !== 0) return;

            // ★重要：タッチの場合、ここでデフォルト動作（画面スクロールなど）を殺す！
            // これがないと、ドラッグしようとした瞬間に画面が動いて操作がキャンセルされちゃうの。
            if (e.type === 'touchstart' && e.cancelable) {
                e.preventDefault();
            }

            e.stopPropagation();

            // ====== ダブルクリック判定 ======
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - this.lastClickTime;
            
            // タッチだと誤爆しやすいので、ダブルクリック判定は少し慎重にする
            // (前回クリックから300ms以内 かつ ドラッグしていない場合...といきたいけど、
            //  一旦シンプルにそのまま判定するわ)
            if (timeDiff < 300 && this.type === 'number') {
                let strVal = this.value.toString();
                if (strVal.startsWith('-')) {
                    strVal = strVal.substring(1);
                } else {
                    strVal = '-' + strVal;
                }
                this.updateValue(strVal);
                App.log(`Sign Toggled: ${this.value}`);
                this.lastClickTime = 0; 
                return; 
            }
            this.lastClickTime = currentTime;
            // ================================

            // ====== 初期フォーカスロジック ======
            if (this.type === 'root' || this.value === '分数' || 
                this.value === '√' || this.value === '|x|' || 
                this.type === 'power' || this.value === '( )') {
                App.focusInitialSlot(el);
            } else {
                if (el.parentElement.classList.contains('card-slot')) {
                    App.setFocus(el.parentElement);
                }
            }
            // ====================================

            App.commitInput();
            
            // App側で座標計算するから、イベント(e)をそのまま渡す
            App.startDrag(e, el, this);
        };

        // マウス用
        el.addEventListener('mousedown', handleStart);

        // タッチ用 (passive: false が必須！)
        el.addEventListener('touchstart', handleStart, { passive: false });
    }




}


// ====== CardMaker (DOM工場) ======
const CardMaker = {
    // ノードリスト(Array of Poly/Operator)を受け取り、カード要素の配列を返す

    createFromNodes(nodes) {
        const elements = [];
        
        nodes.forEach(node => {
            if (node instanceof Poly) {
                // (Polyの処理は既存のまま)
                node.terms.forEach((term, index) => {
                    if (index > 0) {
                        const opVal = term.coeff.s >= 0 ? '+' : '-';
                        elements.push(new MathCard('operator', opVal, 0, 0).element);
                    }
                    const termElems = this.surdToElements(term, index === 0, node.remainderVal);
                    elements.push(...termElems);
                });
            }
            else if (node.type === 'operator') {
                elements.push(new MathCard('operator', node.value, 0, 0).element);
            }


            else if (node.type === 'number') {
                // カードを作成
                const cardInstance = new MathCard('number', node.value.toString(), 0, 0);
                const el = cardInstance.element;

                // ★追加：エンジンからの「色指定」があれば適用 & メモに残す！
                if (node.color) {
                    el.style.color = node.color;
                    el.style.fontWeight = 'bold';
                    el.dataset.color = node.color; // ★ここが大事！HTMLにメモを残す
                }

                // ★追加：エンジンからの「約分後の値」があればメモに残す！
                if (node.reducedValue !== undefined) {
                    el.dataset.reducedValue = node.reducedValue; // ★ここが大事！
                }

                // エンジンからの「斜め線指定」があればクラス付与
                if (node.strike) {
                    el.classList.add('struck-through');
                    el.dataset.strike = "true"; // ★念のためこれも
                }

                elements.push(el);
            }

            else if (node.type === 'variable') {
                elements.push(new MathCard('variable', node.value, 0, 0).element);
            }
            // 生の構造データ(Structure)が来ても表示できるようにする！
            else if (node.type === 'structure') {
                if (node.subType === 'fraction') {
                    // 分数の器を作る
                    const fracCard = new MathCard('structure', '分数', 0, 0).element;
                    
                    // 中身（分子・分母）を再帰的に作る！
                    const numElems = this.createFromNodes(node.numerator);
                    const denElems = this.createFromNodes(node.denominator);
                    
                    // スロットに入れる
                    const numSlot = fracCard.querySelector('.numerator');
                    const denSlot = fracCard.querySelector('.denominator');
                    
                    numElems.forEach(el => {
                        el.style.position = 'static'; el.style.transform = 'scale(0.9)'; el.style.margin = '0 2px';
                        numSlot.appendChild(el);
                    });
                    denElems.forEach(el => {
                        el.style.position = 'static'; el.style.transform = 'scale(0.9)'; el.style.margin = '0 2px';
                        denSlot.appendChild(el);
                    });
                    
                    elements.push(fracCard);
                }
                // ★追加: 記号コンテナ (|x|, ( )) の生成
                else if (node.subType === 'symbol') {
                    const label = (node.symbolType === 'abs') ? '|x|' : '( )';
                    const card = new MathCard('structure', label, 0, 0).element;
                    
                    const slot = card.querySelector('.card-slot');
                    if (slot) {
                        const children = this.createFromNodes(node.content);
                        children.forEach(el => {
                            el.style.position = 'static';
                            el.style.transform = 'scale(0.9)';
                            el.style.margin = '0 2px';
                            slot.appendChild(el);
                        });
                    }
                    elements.push(card);
                }
                // 必要なら他の構造(sqrt, powerなど)もここに追加できるわ
            }
            else if (node.type === 'error') {
                const errCard = new MathCard('error', node.value, 0, 0).element;
                elements.push(errCard);
            }
            else {
                console.warn("Unknown node type in CardMaker:", node);
            }

        });
        
        return elements;
    },
 

    // Surd (coeff * √root * vars) をカード要素に変換

    // Surd (coeff * √root * vars) をカード要素に変換
    surdToElements(surd, isFirstTerm, customRemainder) {
        const elems = [];
        
        // 自動約分阻止 (false) はそのまま
        const absCoeff = new Fraction(Math.abs(surd.coeff.n), surd.coeff.d, false);
        
        // 変数やルートがあるかチェック
        const varKeys = Object.keys(surd.vars).sort();
        const hasVars = varKeys.length > 0;
        const hasRoot = surd.root !== 1;

        // 純粋な数字（変数やルートがない）かどうか
        const isPureNumber = !hasVars && !hasRoot;

        // 現在のモードチェック
        const isDecimalMode = (App.state.displayMode === 'decimal');
        const isMathMode = (App.state.appMode === 'math'); 

        // ★帯分数モードの判定（割り切れない場合のみ！）
        const isMixed = (
            isPureNumber && 
            App.state.fractionMode === 'mixed' && 
            absCoeff.n > absCoeff.d && 
            (absCoeff.n % absCoeff.d !== 0) 
        );

        // --- マイナスの処理方針を決める ---
        const isNegative = surd.coeff.s < 0;

        // A. 数字カード自体にマイナスを含めるか？ (整数/小数用)
        const shouldMergeSignToNumber = (
            isFirstTerm && 
            isNegative && 
            isPureNumber &&
            (absCoeff.d === 1 || isDecimalMode)
        );

        // B. 分数の分子にマイナスを含めるか？ (数学モード用)
        // 条件: 帯分数表示じゃない時だけ、分子に入れる
        const shouldMergeSignToNumerator = (
            isMathMode &&
            isNegative &&
            isPureNumber &&
            absCoeff.d !== 1 && 
            !isDecimalMode &&
            !isMixed 
        );

        // --- 1. 独立した演算子カード(-)を作るか？ ---
        if (isFirstTerm && isNegative && !shouldMergeSignToNumber && !shouldMergeSignToNumerator) {
            const minusCard = new MathCard('operator', '-', 0, 0).element;
            elems.push(minusCard);
        }

        // --- 係数部分の表示判断 ---
        let showCoeff = true;
        if (absCoeff.n === 1 && absCoeff.d === 1) {
            if (hasVars || hasRoot) showCoeff = false;
        }
        if (shouldMergeSignToNumber && absCoeff.n === 1) showCoeff = true;


        if (showCoeff) {
             if (absCoeff.d === 1) {
                 // === 整数の場合 (分母が1) ===
                 let valStr = absCoeff.n.toString();
                 if (shouldMergeSignToNumber) valStr = "-" + valStr;
                 elems.push(new MathCard('number', valStr, 0, 0).element);

             } else {
                 // === 分数・小数・あまりの場合 ===
                 const mode = App.state.displayMode;

                 if (isPureNumber && mode === 'decimal') {
                     // 【小数モード】
                     const decimalVal = absCoeff.n / absCoeff.d;
                     let strVal = decimalVal.toFixed(10).replace(/\.?0+$/, "");
                     if (shouldMergeSignToNumber) strVal = "-" + strVal;

                     const MAX_LEN = 11; 
                     if (strVal.length > MAX_LEN) {
                         let displayVal = strVal.substring(0, MAX_LEN);
                         if (displayVal.endsWith('.')) displayVal = displayVal.slice(0, -1);
                         elems.push(new MathCard('number', displayVal, 0, 0).element);
                         elems.push(new MathCard('operator', '…', 0, 0).element); 
                     } else {
                         elems.push(new MathCard('number', strVal, 0, 0).element);
                     }

                 } else if (isPureNumber && mode === 'remainder') {
                     // 【あまりモード】
                     let quotientStr, remainderStr;
                     if (customRemainder !== undefined && customRemainder !== null) {
                         quotientStr = Math.floor(absCoeff.n / absCoeff.d).toString();
                         remainderStr = customRemainder.toFixed(10).replace(/\.?0+$/, "");
                     } else {
                         const num = (surd.coeff.on !== undefined) ? surd.coeff.on : absCoeff.n;
                         const den = (surd.coeff.od !== undefined) ? surd.coeff.od : absCoeff.d;
                         quotientStr = Math.floor(num / den).toString();
                         remainderStr = (num % den).toString();
                     }
                     elems.push(new MathCard('number', quotientStr, 0, 0).element);
                     elems.push(new MathCard('operator', 'あまり', 0, 0).element); 
                     elems.push(new MathCard('number', remainderStr, 0, 0).element);

                 } else {
                     // 【分数モード】 
                     
                     if (isMixed) {
                         // === 帯分数表示 (余りが出る場合のみ) ===
                         const fracCard = new MathCard('structure', '分数', 0, 0).element;
                         const integerPart = Math.floor(absCoeff.n / absCoeff.d);
                         const remainderNum = absCoeff.n % absCoeff.d;

                         const intSlot = fracCard.querySelector('.integer-part');
                         if (intSlot && integerPart > 0) {
                             const intCard = new MathCard('number', integerPart.toString(), 0, 0).element;
                             intCard.style.position = 'static';
                             intCard.style.transform = 'scale(0.9)';
                             intSlot.appendChild(intCard);
                         }

                         const newFrac = new Fraction(remainderNum, absCoeff.d, false);
                         this.fillFraction(fracCard, newFrac);
                         
                         elems.push(fracCard);

                     } else {
                         // === 仮分数表示 ===
                         // (帯分数モードでも割り切れる場合を含む)
                         
                         const fracCard = new MathCard('structure', '分数', 0, 0).element;
                         
                         // ★★★ ここを修正！ ★★★
                         let displayNum = absCoeff.n;
                         const displayDen = absCoeff.d;

                         if (shouldMergeSignToNumerator) {
                             // 強制的にマイナスをつける
                             displayNum = -absCoeff.n;
                         }

                         // new Fraction() を使わず、直接オブジェクトを作って渡す！
                         // これでエンジンの自動変換を回避できるの。
                         this.fillFraction(fracCard, { n: displayNum, d: displayDen });
                         
                         elems.push(fracCard);
                     }
                 }
             }
        }

        // --- ルート・変数はそのまま ---
        if (hasRoot) {
            const sqrtCard = new MathCard('operator', '√', 0, 0).element;
            const contentSlot = sqrtCard.querySelector('.sqrt-border-top');
            if(contentSlot) {
                const numCard = new MathCard('number', surd.root.toString(), 0, 0).element;
                contentSlot.appendChild(numCard);
                numCard.style.position = 'static';
                numCard.style.transform = 'scale(0.9)';
            }
            elems.push(sqrtCard);
        }

        varKeys.forEach(key => {
            const power = surd.vars[key];
            if (power === 1) {
                const varCard = new MathCard('variable', key, 0, 0).element;
                elems.push(varCard);
            } else {
                const powerCardObj = new MathCard('power', 'Power', 0, 0);
                const powerEl = powerCardObj.element;
                const baseSlot = powerEl.querySelector('.base-slot');
                const expSlot = powerEl.querySelector('.exponent-slot');
                if (baseSlot && expSlot) {
                    const baseCard = new MathCard('variable', key, 0, 0).element;
                    baseSlot.appendChild(baseCard);
                    baseCard.style.position = 'static';
                    baseCard.style.transform = 'scale(0.9)';
                    const expCard = new MathCard('number', power.toString(), 0, 0).element;
                    expSlot.appendChild(expCard);
                    expCard.style.position = 'static';
                    expCard.style.transform = 'scale(0.9)';
                }
                elems.push(powerEl);
            }
        });

        return elems;
    },
    
    // 分数コンテナの中身を埋めるヘルパー
    fillFraction(cardEl, fractionObj) {
        const numSlot = cardEl.querySelector('.numerator');
        const denSlot = cardEl.querySelector('.denominator');
        
        if (numSlot && denSlot) {
            const nCard = new MathCard('number', fractionObj.n.toString(), 0, 0).element;
            const dCard = new MathCard('number', fractionObj.d.toString(), 0, 0).element;
            
            numSlot.appendChild(nCard);
            denSlot.appendChild(dCard);
            
            [nCard, dCard].forEach(c => {
                c.style.position = 'static';
                c.style.transform = 'scale(0.9)';
            });
        }
    }
};

// ====== アプリのメイン処理 ======
const App = {
// 状態管理
    state: {
        activeInputCard: null,    // 今編集中（入力中）のカード
        isNegativeMode: false,    // [New] 負の数入力モードかどうか
        configAutoResetNegative: true, // [New] 設定: 入力確定後に負の数モードを解除するか
        configShowHints: true,  // ヒントを表示するかどうか
        configShowInfo: false,  // 情報ウィンドウを表示するかどうか
        appMode: 'arithmetic',  //  アプリのモード ('arithmetic' か 'math')
        displayMode: 'fraction', // 'fraction' | 'decimal' | 'remainder'
        fractionMode: 'improper', // 分数の表示モード ('improper'=仮分数 / 'mixed'=帯分数)
        lastCommittedCard: null, // 最後に確定したカード
        lastCommitTime: 0,        // 最後に確定した時間(ミリ秒)
        activeSlot: null,        //  現在フォーカスしているスロット
        // 次にカードを生成する位置を覚えるカーソル
        spawnCursor: {
            normalX: 50,  // 普通のカード用 X座標（やや左寄りスタート）
            normalY: 50,  // 普通のカード用 Y座標
            
            structX: 50,  // コンテナ用 X座標
            structY: 150  // コンテナ用 Y座標（一段下）
        }
    },

    log(message) {
        const logBox = document.getElementById('log-content');
        if (!logBox) return;
        
        // 新しいログを一番上に追加するスタイルにするの
        // （以前のログを残しつつ、改行で追記）
        logBox.innerText = `> ${message}\n` + logBox.innerText;
        
        console.log(`[Log] ${message}`);
    },

// ★追加: スロットにフォーカスを当てる関数
    setFocus(slotElement) {
        // 前のフォーカスを消す
        this.clearFocus();

        if (slotElement && slotElement.classList.contains('card-slot')) {
            this.state.activeSlot = slotElement;
            slotElement.classList.add('focused');
            const container = slotElement.closest('.math-card');
            if (container) {
                container.classList.add('selected-container');
            }
            this.log("Focus: Slot Selected");
        }
    },

    // ★追加: フォーカスを解除する関数
    clearFocus() {
        if (this.state.activeSlot) {
            this.state.activeSlot.classList.remove('focused');
            const container = this.state.activeSlot.closest('.math-card');
            if (container) {
                container.classList.remove('selected-container');
            }
            this.state.activeSlot = null;
        }
    },

    dragState: {
        isDragging: false,
        target: null,
        cardInstance: null,
        offsetX: 0, 
        offsetY: 0,
        originalParent: null, 
        hoverSlot: null,
        activeZone: null,     
        ghostSpacer: null,
        hasMoved: false
    },

    // ★追加：マウスでもタッチでも、正しい座標(X,Y)を返す関数
    getEventPos(e) {
        if (e.type.includes('touch')) {
            // タッチイベントの場合
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } else {
            // マウスイベントの場合
            return {
                x: e.clientX,
                y: e.clientY
            };
        }
    },

    init() {
        this.loadConfig();
        this.setupEventListeners();
        this.setupAccordion();
        this.setupGlobalDragEvents();
        this.setupSettingsModal();
        this.setupResizer();
        this.setupWaitAreaButtons();
        this.setupModeButtons();
        this.setAppMode(this.state.appMode);
        this.setupDisplayToggleButton();
        this.updateAllMinusStyles();
        if (typeof MathEngine !== 'undefined') {
            MathEngine.init();
            MathEngine.config.mode = this.state.appMode;
            MathEngine.config.displayMode = this.state.displayMode;
        } else {
            console.error("MathEngine not found. (math-engine.js is missing!)");
        }
        console.log("Math Card Canvas: Ready!");
    },


    // script.js : Appオブジェクトに追加・修正

    // 結果カードを再描画する便利関数（表示切替時に使う）
    refreshActiveResult() {
        if (!this.state.activeSlot) return;
        
        const container = this.state.activeSlot.closest('.container-root');
        if (container && container._resultNodes) {
            this.log("Refreshing view...");
            const slot = container.querySelector('.root-slot');
            slot.innerHTML = ''; // クリア

            // = を再配置
            const equalCard = new MathCard('operator', '=', 0, 0).element;
            equalCard.style.color = '#e25c4a';
            equalCard.style.position = 'static';
            equalCard.style.transform = 'scale(0.9)';
            equalCard.style.margin = '0 4px';
            slot.appendChild(equalCard);

            // 新しい設定でカードを生成
            const newElements = CardMaker.createFromNodes(container._resultNodes);
            newElements.forEach(elem => {
                slot.appendChild(elem);
                elem.style.position = 'static';
                elem.style.transform = 'scale(0.9)';
                elem.style.margin = '0 2px';
            });

            this.focusInitialSlot(container);
            this.updateAllMinusStyles();
        }
    },


    // ★修正: 選択中のコンテナ内の分数だけを、今のモードに合わせて書き換える魔法
    convertAllFractions() {
        // 1. 選択中の場所（スロット）がないなら、誤爆防止のため何もしない
        if (!this.state.activeSlot) {
            this.log("Convert: Please select a container first.");
            return;
        }

        // 2. 範囲を決める！
        // まず、今いる場所の親玉である「式コンテナ(.container-root)」を探す
        let scopeElement = this.state.activeSlot.closest('.container-root');
        
        // もし式コンテナの外（単独で置いた分数カードなど）なら、そのカード自身を対象にする
        if (!scopeElement) {
            scopeElement = this.state.activeSlot.closest('.container-fraction');
        }

        if (!scopeElement) {
            this.log("Convert: No target container found.");
            return;
        }

        // 3. その範囲内にある分数カードだけを集める
        let targets = [];
        
        // 範囲自体が分数カードなら、それだけが対象
        if (scopeElement.classList.contains('container-fraction')) {
            targets.push(scopeElement);
        } 
        // 範囲の中に分数があるなら、それら全部（式コンテナの場合はこっち）
        else {
            targets = Array.from(scopeElement.querySelectorAll('.container-fraction'));
        }

        if (targets.length === 0) return;

        // 4. まとめて変換（ロジックは前回と同じ）
        targets.forEach(frac => {
            const intSlot = frac.querySelector('.integer-part');
            const numSlot = frac.querySelector('.numerator');
            const denSlot = frac.querySelector('.denominator');
            
            if (!intSlot || !numSlot || !denSlot) return;

            // 読み取りヘルパー
            const readVal = (slot) => {
                const numCard = slot.querySelector('.card-number');
                return numCard ? parseInt(numCard.innerText) : 0;
            };

            // 変数入りは無視
            if (frac.querySelector('.card-variable')) return;

            const iVal = readVal(intSlot);
            const nVal = readVal(numSlot);
            const dVal = readVal(denSlot);

            if (dVal === 0) return;

            // 一旦すべて仮分数化 (整数 * 分母 + 分子)
            let totalNum = iVal * dVal + nVal;
            const currentDenom = dVal;

            let newI = 0;
            let newN = totalNum;
            
            // 帯分数モードなら、整数部分を分離
            if (this.state.fractionMode === 'mixed') {
                if (newN >= currentDenom) {
                    newI = Math.floor(newN / currentDenom);
                    newN = newN % currentDenom;
                }
            }

            // カード書き換え関数
            const updateSlot = (slot, val, isIntegerSlot) => {
                slot.innerHTML = '';
                const shouldShow = isIntegerSlot ? (val > 0) : true;

                if (shouldShow) {
                    const newCard = new MathCard('number', val.toString(), 0, 0);
                    slot.appendChild(newCard.element);
                    
                    newCard.element.style.position = 'static';
                    newCard.element.style.transform = 'scale(0.9)';
                    newCard.element.style.margin = '0'; 
                }
            };
            
            updateSlot(intSlot, newI, true);
            updateSlot(numSlot, newN, false);
            updateSlot(denSlot, currentDenom, false);
        });
        
        this.log(`Converted fractions in selection to: ${this.state.fractionMode}`);
    },


    // setupDisplayToggleButton (既存のものを少し修正)


    setupDisplayToggleButton() {
        const btn = document.getElementById('btn-toggle-display');
        if (!btn) return;

        this.updateDisplayButtonLabel(); // 初期表示

        btn.onclick = (e) => {
            e.stopPropagation();

            // ★変更点：
            // 以前はここで「activeSlotが割り算か？」とかチェックしていたけど、
            // 全部とっぱらって、単純な3段サイクルにするの！
            // ユーザーが「あまり」を見たいと言ったら、見せる。それが一番なの。

            const current = this.state.displayMode;
            
            if (current === 'fraction') {
                this.state.displayMode = 'decimal';
            } 
            else if (current === 'decimal') {
                this.state.displayMode = 'remainder';
            } 
            else {
                // remainder -> fraction
                this.state.displayMode = 'fraction';
            }

            if (typeof MathEngine !== 'undefined') {
                MathEngine.config.displayMode = this.state.displayMode;
            }

            this.updateDisplayButtonLabel();
            this.log(`Display: ${this.state.displayMode}`);
            
            // 再描画
            this.refreshActiveResult();
            this.saveConfig();
        };
    },


    setupModeButtons() {
        // --- 1. 算数/数学 トグルボタン ---
        const btnAppMode = document.getElementById('btn-toggle-app-mode');
        if (btnAppMode) {
            const updateLabel = () => {
                // ★修正: 色を変える行を削除したわ！文字だけ切り替えるの。
                if (this.state.appMode === 'arithmetic') {
                    btnAppMode.innerHTML = "◉算数<br>○数学";
                } else {
                    btnAppMode.innerHTML = "○算数<br>◉数学";
                }
            };
            
            updateLabel(); // 初期表示

            btnAppMode.onclick = (e) => {
                e.stopPropagation();
                const newMode = (this.state.appMode === 'arithmetic') ? 'math' : 'arithmetic';
                this.setAppMode(newMode);
                updateLabel();
            };
        }

        // --- 2. 仮分数/帯分数 トグルボタン ---
        const btnFracMode = document.getElementById('btn-toggle-fraction-mode');
        if (btnFracMode) {
            const updateLabel = () => {
                if (this.state.fractionMode === 'improper') {
                    btnFracMode.innerHTML = "◉仮分数<br>○帯分数";
                } else {
                    btnFracMode.innerHTML = "○仮分数<br>◉帯分数";
                }
            };

            updateLabel(); // 初期表示

            btnFracMode.onclick = (e) => {
                e.stopPropagation();
                this.state.fractionMode = (this.state.fractionMode === 'improper') ? 'mixed' : 'improper';
                updateLabel();
                this.log(`Fraction Mode: ${this.state.fractionMode}`);
                this.refreshActiveResult();

                this.convertAllFractions();
                this.saveConfig();
            };
        }
    },

    // ボタンの文字を今のモードに合わせる
    updateDisplayButtonLabel() {
        const btn = document.getElementById('btn-toggle-display');
        if (!btn) return;

        const labels = {
            'decimal': '○分数/◉小数/\n○あまり',
            'fraction': '◉分数/○小数/\n○あまり',
            'remainder': '○分数/○小数/\n◉あまり'
        };
        btn.innerText = labels[this.state.displayMode];
        
        // 色を変えても分かりやすいかも？
        if (this.state.displayMode === 'remainder') {
            btn.style.backgroundColor = '#fff0f0'; // 余りモードはちょっと赤っぽく
        } else if (this.state.displayMode === 'decimal') {
            btn.style.backgroundColor = '#e0f7fa'; // 小数は水色っぽく
        } else {
            btn.style.backgroundColor = ''; // 分数は普通
        }
    },

    setupEventListeners() {
        document.getElementById(FIELD_ID).addEventListener('mousedown', (e) => {
            if (e.target.id === FIELD_ID || e.target.classList.contains('area-label')) {
                this.commitInput();
                this.clearFocus(); // フォーカスも解除する
                this.log("Focus: Cleared");
            }
        });


        // 1. Clearボタン：いきなり消さずに、確認モーダルを出す
        document.getElementById('btn-clear').onclick = (e) => {
            e.stopPropagation(); // 念のため
            const modal = document.getElementById('all-clear-modal');
            if (modal) modal.classList.remove('hidden');
        };

        // --- オールクリア確認モーダルの動作設定 ---
        
        // 「全部消す！」(Yes) ボタン
        const btnAllClearYes = document.getElementById('btn-all-clear-yes');

        if (btnAllClearYes) {
            btnAllClearYes.onclick = () => {
                const field = document.getElementById(FIELD_ID);

                // A. 計算フィールドをクリア
                field.innerHTML = '<div class="area-label">計算フィールド (Canvas)</div>';
                
                // ★追加：スクロール位置を左上（原点）に戻す！
                field.scrollLeft = 0;
                field.scrollTop = 0;

                // B. 待機エリアもクリア（ラベルだけ残す）
                document.getElementById(WAIT_AREA_ID).innerHTML = '<div class="area-label">待機エリア (Waiting Room)</div><div class="wait-tools"><button id="btn-sort-wait" class="btn-func btn-small">整列</button><button id="btn-clear-wait" class="btn-func btn-red btn-small">ゴミ箱</button><div id="wait-clear-confirm" class="confirm-box hidden"><button id="btn-clear-yes" class="btn-func btn-red btn-small">実行</button><button id="btn-clear-no" class="btn-func btn-small">×</button></div></div>';
                
                // C. 状態のリセット
                this.state.activeInputCard = null;
                this.state.activeSlot = null; // フォーカスも外す
                
                // カーソル位置もリセット（これで次に出すカードも左上から出るわ）
                this.state.spawnCursor.normalX = 50; 
                this.state.spawnCursor.normalY = 50;
                this.state.spawnCursor.structX = 50; 
                this.state.spawnCursor.structY = 150; 

                // D. 待機エリアのボタンイベントを再設定
                this.setupWaitAreaButtons();

                // モーダルを閉じてログ出力
                document.getElementById('all-clear-modal').classList.add('hidden');
                this.log("ALL CLEAR executed & View Reset.");
            };
        }

        // 「やめる」(No) ボタン
        const btnAllClearNo = document.getElementById('btn-all-clear-no');
        if (btnAllClearNo) {
            btnAllClearNo.onclick = () => {
                document.getElementById('all-clear-modal').classList.add('hidden');
            };
        }

        // --- ボタンクリック処理にログを追加 ---

        const buttons = document.querySelectorAll('button[data-type]');
        buttons.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                
                // ★修正ポイント: 
                // data-value属性があればそれを使い、なければ従来どおりinnerTextを使う
                // これで見た目が変わってもプログラムは大丈夫！
                let value = btn.getAttribute('data-value');
                if (!value) {
                    value = btn.innerText;
                }

                const type = btn.getAttribute('data-type');
                
                // ログに出す（改行などは見づらいので除去して表示）
                this.log(`Input: [${value.replace(/\n/g, '')}] (type: ${type})`);
                
                this.handleInput(type, value);
            };
        });

        // --- 既存の btn-copy 部分を書き換え ---
        document.getElementById('btn-copy').onclick = (e) => {
            e.stopPropagation(); // 親への伝播を止める
            
            // 1. 選択中のスロットがあるか確認
            if (!this.state.activeSlot) {
                this.log("Copy: Nothing selected (Select a slot inside a card)");
                return;
            }

            // 2. そのスロットの親玉（一番外側のコンテナ、またはそのカード自身）を特定
            // closest('.math-card') で、スロットが所属しているカードを取得
            const originalCardEl = this.state.activeSlot.closest('.math-card');
            
            if (!originalCardEl) return;

            // 3. 複製を実行！
            // 戻り値として「新しく作られたカードのインスタンス」が返ってくるわ
            const newCardInstance = this.duplicateTree(originalCardEl);

            if (newCardInstance) {
                // 4. 位置合わせ：オリジナルの「真下」に置く
                const rect = originalCardEl.getBoundingClientRect();
                const field = document.getElementById(FIELD_ID);
                
                // フィールド内の相対座標に変換
                const fieldRect = field.getBoundingClientRect();
                const currentScrollLeft = field.scrollLeft;
                const currentScrollTop = field.scrollTop;

                // オリジナルの左上座標
                const baseLeft = rect.left - fieldRect.left + currentScrollLeft;
                const baseTop = rect.top - fieldRect.top + currentScrollTop;
                
                // 高さを足して、少し下にずらす
                const newY = baseTop + rect.height + 15; // 15pxの隙間

                // 座標をセット
                newCardInstance.element.style.position = 'absolute';
                newCardInstance.element.style.left = `${baseLeft}px`;
                newCardInstance.element.style.top = `${newY}px`;

                // 5. 仕上げ：フィールドに追加して、選択状態にする
                field.appendChild(newCardInstance.element);
                
                // 新しいカードの最初のスロットにフォーカスを移動（便利機能！）
                this.focusInitialSlot(newCardInstance.element);
                
                this.log("Duplicate: Success!");
            }
        };

        document.getElementById('btn-to-wait').onclick = () => {
            const field = document.getElementById(FIELD_ID);
            const waitArea = document.getElementById(WAIT_AREA_ID);
            
            // フィールド直下のカードを取得
            // (:scope > .math-card で直下のみ指定)
            const cards = Array.from(field.querySelectorAll(':scope > .math-card'));
            
            let movedCount = 0;

            cards.forEach(card => {
                let shouldMove = false;
                
                // 1. カードのタイプ判定
                const info = this.identifyCardType(card);
                
                // 単発カード（数字・変数・演算子）なら回収
                if (['number', 'variable', 'operator'].includes(info.type)) {
                    shouldMove = true;
                }
                // 構造（コンテナ）なら、中身が空っぽかチェック
                else if (['structure', 'root', 'power'].includes(info.type)) {
                    // スロットの中に .math-card が1つもなければ空とみなす
                    if (card.querySelectorAll('.math-card').length === 0) {
                        shouldMove = true;
                    }
                }
                
                // 回収実行！
                if (shouldMove) {
                    waitArea.appendChild(card); // 移動
                    // スタイルリセット（待機エリア用）
                    card.style.position = 'absolute'; // 整列関数がstaticにするけど一応
                    card.classList.remove('selected-container'); // 選択状態解除
                    movedCount++;
                }
            });

            if (movedCount > 0) {
                this.clearFocus(); // フォーカスも外す
                
                // ★既存の整列ボタンの機能を呼び出して綺麗にする！
                document.getElementById('btn-sort-wait').click();
                
                this.log(`Clean up: Moved ${movedCount} cards to Wait Area.`);
            } else {
                this.log("Clean up: No target cards found.");
            }
        };

        // --- キーボード入力のサポート ---
        document.addEventListener('keydown', (e) => {
            // 入力フォームなどにフォーカスがある場合は無視（今回はフォームないけど念のため）
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key; // "Enter", "ArrowUp", "1", "a" など

            // 矢印キーによるフォーカス移動
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                // フォーカス中のスロットがある場合のみ、移動処理を試みる
                if (this.state.activeSlot) {
                    e.preventDefault(); // スクロール防止
                    this.commitInput();
                    this.handleFocusNavigation(key);
                    return; // ボタンクリック処理には行かない
                }
            }
            
            // HTML側の data-key 属性と照合してボタンを探す
            // 例: <button data-key="Enter"> を探す
            let btn = document.querySelector(`button[data-key="${key}"]`);
            
            // Enterだけは特殊対応（テンキーのEnterもあるため）
            if (!btn && key === 'Enter') {
                 btn = document.querySelector(`button[data-key="Enter"]`);
            }

            if (btn) {
                e.preventDefault(); // ブラウザのスクロールなどを防ぐ
                btn.click();        // ボタンを押したことにする！
                btn.classList.add('active'); // 押した感のエフェクト（CSSで設定あれば）
                setTimeout(() => btn.classList.remove('active'), 100);
            }
        });
    },


    // ★重要：入力ロジックの司令塔

    handleInput(type, value) {
        // バックスペース (Delete) 機能（即消滅 & モード解除版）

        // ====== バックスペース (Delete) 機能の拡張 ======
        if (type === 'delete') {
            
            // --- パターンA: 今、数字カードを編集中 ---
            if (this.state.activeInputCard && this.state.activeInputCard.type === 'number') {
                const currentVal = this.state.activeInputCard.value.toString();
                
                // 1. 1文字削った姿をシミュレーション
                const nextVal = currentVal.slice(0, -1);

                // 2. 「空っぽ」か「マイナス記号だけ」になるなら消滅
                if (nextVal === '' || nextVal === '-') {
                    this.state.activeInputCard.element.remove();
                    this.state.activeInputCard = null;
                    
                    // ★変更点1: フォーカスは外さない！（clearFocusしない）
                    // むしろ、今のアクティブスロットを再確認して、選択状態を維持するの。
                    if (this.state.activeSlot) {
                        this.setFocus(this.state.activeSlot);
                        this.log("Backspace: Card Removed (Focus Kept)");
                    } else {
                        // スロット外（フィールド直下）なら外してもいいけど、一応クリア
                        this.clearFocus();
                    }
                    
                    // 負の数モードの解除処理
                    if (this.state.isNegativeMode) {
                        this.state.isNegativeMode = false;
                        const signBtn = document.querySelector('button[data-type="sign"]');
                        if (signBtn) signBtn.classList.remove('active');
                    }
                    this.updateAllMinusStyles();

                } 
                // 3. まだ数字が残るなら更新
                else {
                    this.state.activeInputCard.updateValue(nextVal);
                    this.log("Backspace: Deleted last char");
                }
                return;
            }

            // --- パターンB: 編集中のカードはないけれど、スロットを選択中 ---
            // ★追加機能: 直前に作ったカード（＝スロットの末尾にあるカード）を消す機能！
            if (this.state.activeSlot) {
                // スロット内のカード要素だけを集める（spacerなどは無視）
                const cards = Array.from(this.state.activeSlot.children)
                                   .filter(c => c.classList.contains('math-card'));
                
                if (cards.length > 0) {
                    // 一番後ろ（最新）のカードを取得
                    const lastCard = cards[cards.length - 1];
                    
                    // 削除実行！
                    lastCard.remove();
                    this.log("Backspace: Deleted previous card in slot");
                    
                    // マイナスの色などを再計算
                    this.updateAllMinusStyles();
                }
            }

            return;
        }
        
        // --- 1. 負の数モード切替 (Sign) ---

        if (type === 'sign') {
            this.state.isNegativeMode = !this.state.isNegativeMode;
            const signBtn = document.querySelector('button[data-type="sign"]');
            
            // A. ボタンの見た目を更新
            if (signBtn) {
                if (this.state.isNegativeMode) {
                    signBtn.classList.add('active');
                    this.log("Negative Mode: ON");
                } else {
                    signBtn.classList.remove('active');
                    this.log("Negative Mode: OFF");
                }
            }

            // B. 編集中（入力中）のカードがあれば、即座に反映させる！
            if (this.state.activeInputCard && this.state.activeInputCard.type === 'number') {
                let currentVal = this.state.activeInputCard.value.toString();
                
                if (this.state.isNegativeMode) {
                    // モードONになったので、マイナスをつける（まだついてなければ）
                    if (!currentVal.startsWith('-')) {
                        currentVal = '-' + currentVal;
                    }
                } else {
                    // モードOFFになったので、マイナスをとる（ついていれば）
                    if (currentVal.startsWith('-')) {
                        currentVal = currentVal.substring(1);
                    }
                }
                
                // 値を更新
                this.state.activeInputCard.updateValue(currentVal);
                this.log("Sign applied to active card immediately");
            }
            return;
        }

        // --- 2. 決定アクション (Enter) ---
        if (type === 'action' && value === '決定') {
            
            let handled = false; // 何か処理をしたかどうかのフラグ

            // 【優先度 1】編集中なら、まず確定する
            if (this.state.activeInputCard) {
                this.commitInput(); 
                this.log("Input Committed (Enter)");
                handled = true; 
            }

            // 【優先度 2】直前(0.25秒以内)に数字を確定していたら、負の数トグル
            else if (!handled && this.state.lastCommittedCard) {
                const now = Date.now();
                if (now - this.state.lastCommitTime < 250) {
                    
                    const card = this.state.lastCommittedCard;
                    
                    // 数字カードなら符号反転
                    if (card.type === 'number') {
                        let strVal = card.value.toString();
                        if (strVal.startsWith('-')) {
                            strVal = strVal.substring(1);
                        } else {
                            strVal = '-' + strVal;
                        }
                        card.updateValue(strVal);
                        this.log("Quick Enter: Converted to Negative!");
                        
                        this.state.lastCommitTime = 0; // リセット
                        handled = true;
                    }
                }
            }

            // 【優先度 3】フォーカスの階層移動 (Ascent)
            if (!handled && this.state.activeSlot) {
                const currentSlot = this.state.activeSlot;
                const containerCard = currentSlot.closest('.math-card');

                if (containerCard) {
                    const parentSlot = containerCard.parentElement;
                    if (parentSlot && parentSlot.classList.contains('card-slot')) {
                        this.setFocus(parentSlot);
                        this.log("Focus: Ascended to Parent");
                    } else {
                        this.clearFocus();
                        this.log("Focus: Cleared (Top Level)");
                    }
                } else {
                    this.clearFocus();
                }
            }


            // ====== ★ここが更新ポイント！ エンジンの呼び出し処理 ======
            
            // 1. フィールド上のカードを全部集める
            const field = document.getElementById(FIELD_ID);
            // 待機エリア以外の、フィールド直下にあるカードだけを取得
            const cards = Array.from(field.querySelectorAll(':scope > .math-card'));
            
            if (cards.length > 0) {
                // 2. エンジンに渡して解析＆計算させる
                if (typeof MathEngine !== 'undefined') {
                    
                    // Step 1: 読み取り (Parse)
                    const parsedData = MathEngine.parse(cards);
                    
                    // Step 2: 計算 (Calculate) ★新機能！
                    const result = MathEngine.calculate(parsedData);
                    
                    // --- 結果の表示処理 ---
                    let resultMsg = "Calculation Error";
                    
                    // Fraction.jsのオブジェクトなら、見やすい文字列に変換
                    if (result && typeof result.toFraction === 'function') {
                        // toFraction(true) で「帯分数」形式にする
                        resultMsg = result.toFraction(true); 
                    } else {
                        // エラーメッセージなどの場合
                        resultMsg = result; 
                    }

                    // ログにドカンと表示！
                    this.log(`Parsed Data:\n${JSON.stringify(parsedData, null, 2)}`);
                    this.log(`\n★★★ Answer: ${resultMsg} ★★★`); // これが見たかったの！
                    
                    console.log("Parsed:", parsedData);
                    console.log("Calculated:", result);
                }
            }
            // ================================================

            return;
        }

        // ====== 矢印キー (Nav) ======
        if (type === 'nav') {
            
            // 1. ボタンの文字（↑↓←→）を、プログラム用のキー名に変換する辞書
            const keyMap = {
                '↑': 'ArrowUp',
                '↓': 'ArrowDown',
                '←': 'ArrowLeft',
                '→': 'ArrowRight'
            };
            
            const keyName = keyMap[value]; // 例: "↑" → "ArrowUp"

            // 2. 移動処理を実行
            if (keyName && this.state.activeSlot) {
                // 移動する前に、今の入力を確定しておく（物理キーと同じ挙動！）
                this.commitInput();
                
                // 移動ロジックを呼び出す
                this.handleFocusNavigation(keyName);
            }
            
            return; 
        }

        // --- 3. 数字入力 (Number) ---
        if (type === 'number') {
            if (this.state.activeInputCard) {
                const currentVal = this.state.activeInputCard.value.toString();
                if (value === '.' && currentVal.includes('.')) return; 

                let newVal;
                if (currentVal === '0' && value !== '.') newVal = value;
                else if (currentVal === '-0' && value !== '.') newVal = '-' + value;
                else newVal = currentVal + value;

                this.state.activeInputCard.updateValue(newVal);
            } else {
                let initialValue = value;
                if (value === '.') initialValue = '0.';
                if (this.state.isNegativeMode) initialValue = '-' + value;
                
                const card = this.spawnCard('number', initialValue, 100, 100);
                this.startEditing(card);
            }
        }
        

        // --- 4. それ以外（演算子、コンテナなど） ---
        else {
            this.commitInput(); 

            // 「＝」ボタン
            if (value === '=') {
                this.generateNextStep();
                return;
            }

            // ★修正: べき乗ボタンの判定を data-value="power" に対応させる
            if (value === 'power' || type === 'power') {
                this.spawnCard('power', 'Power', 100, 100);
                return;
            }
            
            if (value.includes('式')) {
                this.spawnCard('root', 'Root', 50, 50);
            } else {
                // その他の通常のカード生成
                this.spawnCard(type, value, 100, 100);
            }
        }
    },



    // ★重要: 「＝」ボタンが押された時のメイン処理
    generateNextStep() {
        // 1. ターゲットを探す
        if (!this.state.activeSlot) {
            this.log("Target? : Please select a formula first.");
            return;
        }

        const currentRoot = this.state.activeSlot.closest('.container-root');
        if (!currentRoot) {
            this.log("Target? : Please use inside 'Root' container.");
            return;
        }

        // 2. 中身を解析する (Parse)
        const rootSlot = currentRoot.querySelector('.root-slot');
        if (!rootSlot) return;
        
        const cards = Array.from(rootSlot.querySelectorAll(':scope > .math-card'))
                           .filter(card => card.innerText.trim() !== '=');

        if (cards.length === 0) return;

        // ====== 空気読みモード切り替え (Auto Mode Switcher) ======
        if (this.state.displayMode !== 'remainder') {
            let hasDecimal = false;
            let hasFraction = false;
            cards.forEach(card => {
                if (card.classList.contains('container-fraction')) hasFraction = true;
                if (card.classList.contains('card-number') && card.innerText.includes('.')) hasDecimal = true;
            });
            let newMode = null;
            if (hasFraction) newMode = 'fraction';
            else if (hasDecimal && this.state.displayMode === 'fraction') newMode = 'decimal';

            if (newMode && this.state.displayMode !== newMode) {
                this.state.displayMode = newMode;
                if (typeof MathEngine !== 'undefined') MathEngine.config.displayMode = newMode;
                this.updateDisplayButtonLabel();
                this.log(`Auto Mode Switch: ${newMode}`);
            }
        }
        // =========================================================

        const nodes = MathEngine.parse(cards);
        
        // 3. 1歩だけ計算する
        const result = MathEngine.stepSolve(nodes);
        
        if (!result.changed) {
            this.log("Complete! (No more steps)");
            this.clearFocus();
            return;
        }

        // 4. 新しい行を作る
        const rect = currentRoot.getBoundingClientRect();
        const field = document.getElementById(FIELD_ID);
        const fieldRect = field.getBoundingClientRect();
        
        const currentRight = (rect.left + rect.width) - fieldRect.left + field.scrollLeft;
        const currentTop  = rect.top - fieldRect.top + field.scrollTop;
        const newY = currentTop + rect.height + 15;

        const newRootCard = new MathCard('root', 'Root', 0, newY);
        newRootCard.element._resultNodes = result.nodes;
        field.appendChild(newRootCard.element);
        
        // 5. 中身を埋める
        const newRootSlot = newRootCard.element.querySelector('.root-slot');
        
        // (A) 「＝」カード
        const equalCard = new MathCard('operator', '=', 0, 0).element;
        equalCard.style.color = '#e25c4a';
        newRootSlot.appendChild(equalCard);
        equalCard.style.position = 'static';
        equalCard.style.transform = 'scale(0.9)';
        equalCard.style.margin = '0 4px';

        // (B) 計算結果のカードたち
        const newCardElements = CardMaker.createFromNodes(result.nodes);

        // ★★★ ここにあった「無限ループ防止チェック」は完全に削除したわ！ ★★★
        // もう二度と邪魔はさせないの！

        newCardElements.forEach(elem => {
            newRootSlot.appendChild(elem);
            elem.style.position = 'static';
            elem.style.transform = 'scale(0.9)';
            elem.style.margin = '0 2px';
        });

        // 位置合わせ
        const newWidth = newRootCard.element.offsetWidth;
        const newX = currentRight - newWidth;
        newRootCard.element.style.left = `${newX}px`;
        newRootCard.element.style.position = 'absolute';

        // 6. 仕上げ
        this.focusInitialSlot(newRootCard.element);
        this.updateAllMinusStyles();
        
        // ★修正版の魔法を呼び出す！
        this.tryAutoVisualReduction(newRootCard.element, result.nodes);
        
        this.log("Step Generated! (Right Aligned) 🌰");
    },


    // ★修正版: 0.5秒後に色をつける魔法（Poly対応版！）
    tryAutoVisualReduction(cardElement, nodes) {
        if (nodes.length !== 1) return;

        let fractionNode = null;

        // パターンA: 構造体としての分数 (Fraction Structure)
        if (nodes[0].type === 'structure' && nodes[0].subType === 'fraction') {
            fractionNode = nodes[0];
        }
        // パターンB: 計算結果としてのPoly (Poly Object) ★ここを追加！
        else if (nodes[0] instanceof Poly) {
             const poly = nodes[0];
             // 項が1つだけの時
             if (poly.terms.length === 1) {
                 const term = poly.terms[0];
                 // シンプルな数字だけの分数かチェック (ルートや変数がないこと)
                 if (term.root === 1 && Object.keys(term.vars).length === 0) {
                      const nVal = term.coeff.n * term.coeff.s;
                      const dVal = term.coeff.d;
                      
                      // 分母が1より大きい（分数である）場合のみ対象
                      if (dVal > 1) {
                          // エンジンが理解できる「構造体」のフリをする
                          fractionNode = {
                              type: 'structure', 
                              subType: 'fraction',
                              numerator: [{ type: 'number', value: nVal }],
                              denominator: [{ type: 'number', value: dVal }]
                          };
                      }
                 }
             }
        }

        if (!fractionNode) return;

        // エンジンの名探偵に「約分ペアはある？」と聞く
        if (typeof MathEngine !== 'undefined') {
            const visualResult = MathEngine.findReductionPairs(fractionNode);
            
            // もし約分ペアが見つかったら...
            if (visualResult) {
                this.log("Auto Reduction: Scheduled in 0.5s...");

                setTimeout(() => {
                    // DOM要素を直接いじって、色と斜め線をつける！
                    const fracContainer = cardElement.querySelector('.container-fraction');
                    if (!fracContainer) return;

                    const applyStyles = (slotClass, list) => {
                        const slot = fracContainer.querySelector(`.${slotClass}`);
                        if (!slot) return;
                        
                        // Polyの場合でも、CardMakerは同じ構造(.numerator/.denominator)で作ってくれているから、
                        // このセレクタでちゃんと要素が見つかるの！
                        const cardElems = Array.from(slot.querySelectorAll(':scope > .card-number'));
                        let cardIndex = 0;
                        
                        list.forEach(node => {
                            if (node.type === 'number') {
                                const el = cardElems[cardIndex];
                                if (el) {
                                    if (node.color) {
                                        el.style.transition = 'color 0.5s, text-decoration 0.5s'; 
                                        el.style.color = node.color;
                                        el.style.fontWeight = 'bold';
                                        el.dataset.color = node.color; 
                                    }
                                    if (node.strike) {
                                        el.classList.add('struck-through');
                                        el.dataset.strike = "true"; 
                                    }
                                    if (node.reducedValue !== undefined) {
                                        el.dataset.reducedValue = node.reducedValue;
                                    }
                                }
                                cardIndex++;
                            }
                        });
                    };

                    applyStyles('numerator', visualResult.numerator);
                    applyStyles('denominator', visualResult.denominator);
                    
                    this.log("Auto Reduction: Applied! ✨");

                }, 500); // 0.5秒待機
            }
        }
    },

    // 編集モードを開始する
    startEditing(cardInstance) {
        this.commitInput(); // 念のため前のを確定
        this.state.activeInputCard = cardInstance;
        cardInstance.element.classList.add('editing'); //見た目を変える
    },

// 入力を確定（Commit）する
    commitInput() {
        // 編集中なら編集終了
        if (this.state.activeInputCard) {
            
            // ====== 🛠️ ここに追加: 禁則処理（お掃除） ======
            const card = this.state.activeInputCard;
            let val = card.value.toString();

            // 末尾が「.」なら削除する (例: "2." -> "2")
            // ただし "2.5" とかはそのまま通す
            if (val.length > 1 && val.endsWith('.')) {
                val = val.slice(0, -1); // 後ろの1文字をカット
                card.updateValue(val);  // カードの値を更新
                this.log(`Fixed format: ${val}`); // ログに残す
            }
            // ============================================

            // ====== ✨ 完了前のメモ（既存のコード） ======
            this.state.lastCommittedCard = this.state.activeInputCard;
            this.state.lastCommitTime = Date.now(); // 現在時刻
            this.state.activeInputCard.element.classList.remove('editing'); 
            this.state.activeInputCard = null; 
            
            // [New] 設定がONなら、負の数モードを解除してあげる
            if (this.state.configAutoResetNegative && this.state.isNegativeMode) {
                this.state.isNegativeMode = false;
                
                // 見た目も戻す
                const signBtn = document.querySelector('button[data-type="sign"]');
                if (signBtn) signBtn.classList.remove('active');
                
                this.log("Negative Mode: Auto Reset");
            }
        }
        // 編集中じゃなくても、決定キーなどで強制解除したい場合はここに書くけど
        // 「入力確定時」という仕様なら、ifの中でOK
    },


    setupAccordion() {
        const headers = document.querySelectorAll('.grid-head');
        
        // ヘルパー: セクションの開閉を実行する関数
        const toggleSection = (header, isOpen) => {
            if (isOpen) {
                header.classList.remove('closed');
            } else {
                header.classList.add('closed');
            }

            let nextElem = header.nextElementSibling;
            // 次の見出しが来るまで、中身のボタンを隠したり出したりする
            while (nextElem && !nextElem.classList.contains('grid-head')) {
                if (isOpen) {
                    nextElem.classList.remove('hidden-btn');
                } else {
                    nextElem.classList.add('hidden-btn');
                }
                nextElem = nextElem.nextElementSibling;
            }
        };

        // 1. 初期化（保存された状態を復元）
        headers.forEach(header => {
            const key = header.innerText.trim();
            // 記録がない場合は「開く(true)」がデフォルト
            let isOpen = true;
            
            if (this.state.accordionState && typeof this.state.accordionState[key] !== 'undefined') {
                isOpen = this.state.accordionState[key];
            }

            // もし「閉じる」記録があったら、最初から閉じておく
            if (!isOpen) {
                toggleSection(header, false);
            }

            // 2. クリックイベントの設定
            header.onclick = () => {
                const isCurrentlyClosed = header.classList.contains('closed');
                const newState = isCurrentlyClosed; // 閉じてたら開く(true)、開いてたら閉じる(false)

                toggleSection(header, newState);

                // 状態を記録して保存
                if (!this.state.accordionState) this.state.accordionState = {};
                this.state.accordionState[key] = newState;
                this.saveConfig();
            };
        });
    },

// コンテナごとの初期スロットを特定してフォーカスする共通関数
    focusInitialSlot(containerEl) {
        let initialSlot = null;
        
        // 分数コンテナ
        if (containerEl.classList.contains('container-fraction')) {
            initialSlot = containerEl.querySelector(':scope > .fraction-part > .denominator');
        }
        // √コンテナ
        else if (containerEl.classList.contains('container-sqrt')) {
            initialSlot = containerEl.querySelector(':scope > .coefficient-part');
        }
        // べき乗コンテナ
        else if (containerEl.classList.contains('container-power')) {
            initialSlot = containerEl.querySelector(':scope > .base-slot');
        }
        // その他のコンテナ (式, ( ), |x| など)
        else {
            const slots = containerEl.querySelectorAll(':scope > .card-slot');
            if (slots.length > 0) {
                initialSlot = slots[0];
            } else {
                 initialSlot = containerEl.querySelector('.card-slot');
            }
        }

        if (initialSlot) {
            this.setFocus(initialSlot);
        }
    },



    // script.js : spawnCard メソッドをこれに書き換え

    spawnCard(type, value, x, y) { 
        let targetParent = document.getElementById(FIELD_ID);
        let isAbsolute = true;
        let finalX = x;
        let finalY = y;

        // A. スロットの中に生成する場合（変更なし）
        if (this.state.activeSlot) {
            targetParent = this.state.activeSlot;
            isAbsolute = false; 
        } 

        // B. フィールド直下に生成する場合（★ここを大改造！）
        else {
            const field = targetParent;
            const scrollTop = field.scrollTop;
            const scrollLeft = field.scrollLeft;
            const clientW = field.clientWidth;  // 画面の幅
            const clientH = field.clientHeight; // 画面の高さ

            // 1. 今、画面内（ビューポート）に見えているカードを探す
            const cards = Array.from(field.querySelectorAll(':scope > .math-card'));
            
            let maxBottom = -Infinity; // 一番下のY座標を記録
            let foundVisible = false;  // 画面内にカードがあったか？

            // 判定基準: 画面の上下左右に入っているか
            const viewTop = scrollTop;
            const viewBottom = scrollTop + clientH;
            const viewLeft = scrollLeft;
            const viewRight = scrollLeft + clientW;

            cards.forEach(card => {
                const cardTop = card.offsetTop;
                const cardLeft = card.offsetLeft;
                const cardH = card.offsetHeight;
                const cardW = card.offsetWidth;
                
                // カードの四隅のどこかが画面内に入っていれば「見えている」とみなす
                // (簡易判定として、縦方向の重複チェック＋横方向の重複チェック)
                const isVerticalVisible = (cardTop + cardH > viewTop) && (cardTop < viewBottom);
                const isHorizontalVisible = (cardLeft + cardW > viewLeft) && (cardLeft < viewRight);

                if (isVerticalVisible && isHorizontalVisible) {
                    // 一番下のラインを更新
                    if (cardTop + cardH > maxBottom) {
                        maxBottom = cardTop + cardH;
                    }
                    foundVisible = true;
                }
            });

            // 2. 座標を決定
            if (foundVisible) {
                // ケースA: 画面内にカードがあるなら、その「一番下」に置く（左寄せ）
                finalY = maxBottom + 30;  // 30pxの隙間
                finalX = scrollLeft + 50; // X座標は左側（改行イメージ）
            } else {
                // ケースB: 画面に何もない（真っ白な場所に移動した）なら、「右上」に置く！
                // Y座標：上から少し空ける
                finalY = scrollTop + 50;
                
                // X座標：右端から少し戻る
                // 「式コンテナ」の幅を考慮して、右端から250pxくらい左に置くのが安全かな？
                finalX = scrollLeft + 50; 
                
                // ※画面がスマホなどで狭すぎて、左にはみ出る場合は補正する
                if (finalX < scrollLeft + 20) {
                    finalX = scrollLeft + 20;
                }
            }
        }

        // --- 以下、生成処理（変更なし） ---
        const card = new MathCard(type, value, finalX, finalY);
        targetParent.appendChild(card.element);

        if (!isAbsolute) {
            card.element.style.position = 'static';
            card.element.style.left = '';
            card.element.style.top = '';
            card.element.style.transform = 'scale(0.9)';
            card.element.style.margin = '0 2px';         
        } else {
            card.element.style.left = `${finalX}px`;
            card.element.style.top = `${finalY}px`;
        }

        // コンテナなら中身に自動フォーカス
        if (type === 'root' || value === '分数' || value === '√' || value === '|x|' || type === 'power' || value === '( )') {
            this.focusInitialSlot(card.element);
        }

        this.updateAllMinusStyles();

        return card;
    },

    // ★Phase 3: 矢印キーによるフォーカス移動ロジック
    handleFocusNavigation(key) {
        const currentSlot = this.state.activeSlot;
        if (!currentSlot) return; // フォーカスがなければ何もしない

        // 親のコンテナカードを探す
        // (スロットの親要素がコンテナのはずだけど、念のためclosestで探す)
        const container = currentSlot.closest('.math-card');
        if (!container) return;

        let targetSlot = null;

        // --- A. 分数コンテナの移動ルール ---
if (container.classList.contains('container-fraction')) {
            // 現在: 分母 (Initial)
            if (currentSlot.classList.contains('denominator')) {
                if (key === 'ArrowUp') targetSlot = container.querySelector(':scope > .fraction-part > .numerator');
                if (key === 'ArrowLeft' || key === 'ArrowRight') targetSlot = container.querySelector(':scope > .integer-part');
            }
            // 現在: 分子
            else if (currentSlot.classList.contains('numerator')) {
                if (key === 'ArrowDown') targetSlot = container.querySelector(':scope > .fraction-part > .denominator');
                if (key === 'ArrowLeft' || key === 'ArrowRight') targetSlot = container.querySelector(':scope > .integer-part');
            }
            // 現在: 帯分数（整数）部分
            else if (currentSlot.classList.contains('integer-part')) {
                // ★追加: 上を押すと分子へ！
                if (key === 'ArrowUp') targetSlot = container.querySelector(':scope > .fraction-part > .numerator');
                
                // ★追加: 下を押すと分母へ！（右キーも分母へ行くようにしてあるわ）
                if (key === 'ArrowDown' || key === 'ArrowRight') targetSlot = container.querySelector(':scope > .fraction-part > .denominator');
            }
        }

        // --- B. √コンテナの移動ルール ---
        else if (container.classList.contains('container-sqrt')) {
            // 現在: 係数 (Initial)
            if (currentSlot.classList.contains('coefficient-part')) {
                // 右に行くと中身へ
                if (key === 'ArrowRight') targetSlot = container.querySelector(':scope > .sqrt-border-top');
            }
            // 現在: 中身（被開平数）
            else if (currentSlot.classList.contains('sqrt-border-top')) {
                // 左に行くと係数へ
                if (key === 'ArrowLeft') targetSlot = container.querySelector(':scope > .coefficient-part');
            }
        }

        // --- C. べき乗コンテナの移動ルール ---
        else if (container.classList.contains('container-power')) {
            // 現在: 底 (Initial)
            if (currentSlot.classList.contains('base-slot')) {
                // 右か上で指数へ
                if (key === 'ArrowRight' || key === 'ArrowUp') targetSlot = container.querySelector(':scope > .exponent-slot');
            }
            // 現在: 指数
            else if (currentSlot.classList.contains('exponent-slot')) {
                // 左か下で底へ
                if (key === 'ArrowLeft' || key === 'ArrowDown') targetSlot = container.querySelector(':scope > .base-slot');
            }
        }

        // --- 移動実行 ---
        if (targetSlot) {
            this.setFocus(targetSlot);
            // ログは見やすいようにシンプルに
            // this.log(`Nav: ${key}`); 
        }
    },

// --- ドラッグ＆ドロップ機能（ソート・挿入対応版） ---

// script.js の App オブジェクト内

    setupGlobalDragEvents() {
        // ------ マウス用 (PC) ------
        window.addEventListener('mousemove', (e) => {
            if (!App.dragState.isDragging) return;
            e.preventDefault(); // 範囲選択などを防ぐ
            App.updateDragPosition(e);
            App.handleSortableDrag(e);
        });

        window.addEventListener('mouseup', () => {
            if (!App.dragState.isDragging) return;
            App.endDrag();
        });

        // ------ タッチ用 (iPad/スマホ) ------
        // ★ここが修正ポイント！ document ではなく window にイベントを張るの！
        // これで、指が画面外に出たり、DOMが変わっても追跡できるわ。
        
        window.addEventListener('touchmove', (e) => {
            if (!App.dragState.isDragging) return;
            
            // ドラッグ中は画面全体のスクロールを完全に禁止する（超重要）
            if (e.cancelable) e.preventDefault(); 
            
            App.updateDragPosition(e);
            App.handleSortableDrag(e); 
        }, { passive: false });

        // タッチ終了時の処理を関数化
        const handleTouchEnd = () => {
            if (!App.dragState.isDragging) return;
            App.endDrag();
        };

        // 指が離れた時
        window.addEventListener('touchend', handleTouchEnd);
        
        // ★追加：電話着信やアラートなどで中断された時も、ちゃんと終了させる
        window.addEventListener('touchcancel', handleTouchEnd);
    },

// ====== 書き換え: setupSettingsModal の拡張 ======
    setupSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const btnSettings = document.getElementById('btn-settings');
        const btnClose = document.getElementById('close-modal-btn');
        const toggleInfo = document.getElementById('toggle-info-window');
        const infoWindow = document.getElementById('info-window');
        
        // [New] 負の数モード設定スイッチ
        const toggleAutoReset = document.getElementById('toggle-auto-reset-negative');
        // ヒント表示スイッチの取得
        const toggleHints = document.getElementById('toggle-focus-hints');

        // 1. 設定ボタンで開く
        if (btnSettings) {
            btnSettings.onclick = (e) => {
                e.stopPropagation();
                modal.classList.remove('hidden');
            };
        }

        // 2. 閉じるボタンで閉じる
        if (btnClose) {
            btnClose.onclick = () => {
                modal.classList.add('hidden');
            };
        }

        // 3. モーダルの外側をクリックしても閉じる
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            };
        }

        // 4. 情報ウィンドウのON/OFF
        if (toggleInfo && infoWindow) {
            
            // 初期化（ロードした設定を反映）
            // スイッチの状態を合わせる
            toggleInfo.checked = this.state.configShowInfo;
            // 実際のウィンドウの表示/非表示を合わせる
            infoWindow.style.display = this.state.configShowInfo ? 'flex' : 'none';

            toggleInfo.onchange = () => {
                // stateを更新
                this.state.configShowInfo = toggleInfo.checked;
                
                // 見た目を更新
                if (this.state.configShowInfo) {
                    infoWindow.style.display = 'flex';
                    this.log("Info Window: ON");
                } else {
                    infoWindow.style.display = 'none';
                }
                
                // 設定を保存！
                this.saveConfig();
            };
        }
        
        // ヒントスイッチのロジック
        if (toggleHints) {
            // 1. 初期化: stateに合わせてチェックを入れる
            toggleHints.checked = this.state.configShowHints;
            
            // 2. bodyにクラスをつける関数
            const updateHintClass = () => {
                if (this.state.configShowHints) {
                    document.body.classList.add('show-nav-hints'); // CSS用の目印クラス
                } else {
                    document.body.classList.remove('show-nav-hints');
                }
            };
            
            // 初回実行
            updateHintClass();

            // 3. 切り替え時の処理
            toggleHints.onchange = () => {
                this.state.configShowHints = toggleHints.checked;
                updateHintClass(); // クラスを付け外し
                this.saveConfig();
                this.log(`Focus Hints: ${this.state.configShowHints ? 'ON' : 'OFF'}`);
            };
        }

        // [New] 負の数モード自動解除のON/OFF
        if (toggleAutoReset) {
            // 初期値をstateと同期
            toggleAutoReset.checked = this.state.configAutoResetNegative;
            
            toggleAutoReset.onchange = () => {
                this.state.configAutoResetNegative = toggleAutoReset.checked;
                this.saveConfig();
                this.log(`Auto Reset Negative Mode: ${this.state.configAutoResetNegative}`);
            };
        }
    },


    // 待機エリアのリサイズ機能


    // script.js の setupResizer メソッド（完全書き換え版）

    setupResizer() {
        // 現在リサイズ中の情報を保持する変数（これが司令塔！）
        let resizingState = {
            isResizing: false,
            targetId: null,   // 'info-window' or 'wait-area'
            direction: null,  // 'top-down' or 'bottom-up'
            handle: null
        };

        // --- A. リサイズ開始（ハンドルを触った時） ---
        const startResize = (e, targetId, direction, handleElement) => {
            // スクロールなどの標準動作を防ぐ（タッチの場合）
            if (e.cancelable) e.preventDefault();
            e.stopPropagation(); // 他の要素にイベントを伝えない

            resizingState = {
                isResizing: true,
                targetId: targetId,
                direction: direction,
                handle: handleElement
            };

            handleElement.classList.add('active');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none'; // 文字選択防止
        };

        // 各ハンドルにリスナーを設定
        const setupHandle = (handleId, targetId, direction) => {
            const handle = document.getElementById(handleId);
            if (!handle) return;

            // マウス
            handle.addEventListener('mousedown', (e) => startResize(e, targetId, direction, handle));
            
            // タッチ（passive: false が超重要！）
            handle.addEventListener('touchstart', (e) => startResize(e, targetId, direction, handle), { passive: false });
        };

        // 1. 待機エリア用ハンドル（下）の設定
        setupHandle('resize-handle', 'wait-area', 'bottom-up');

        // 2. 情報エリア用ハンドル（上）の設定
        setupHandle('info-resize-handle', 'info-window', 'top-down');


        // --- B. リサイズ中（画面全体で監視） ---
        const onMove = (e) => {
            if (!resizingState.isResizing) return;

            // ドラッグ中は絶対にスクロールさせない
            if (e.cancelable) e.preventDefault();

            // 座標取得（マウス/タッチ共通化）
            let clientY;
            if (e.type.includes('touch')) {
                clientY = e.touches[0].clientY;
            } else {
                clientY = e.clientY;
            }

            const target = document.getElementById(resizingState.targetId);
            if (!target) return;

            // 高さ計算ロジック
            if (resizingState.direction === 'bottom-up') {
                // 下の待機エリア： (ウィンドウの高さ - 指の位置)
                const newHeight = window.innerHeight - clientY;
                // 制限: 最小100px 〜 最大画面の60%
                if (newHeight > 100 && newHeight < window.innerHeight * 0.6) {
                    target.style.height = `${newHeight}px`;
                }
            } else {
                // 上の情報エリア： (指の位置 そのまま)
                const newHeight = clientY;
                // 制限: 最小40px 〜 最大300px
                if (newHeight > 40 && newHeight < 300) {
                    target.style.height = `${newHeight}px`;
                }
            }
        };

        // --- C. リサイズ終了 ---
        const onEnd = () => {
            if (resizingState.isResizing) {
                if (resizingState.handle) resizingState.handle.classList.remove('active');
                resizingState.isResizing = false;
                resizingState.handle = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        // 監視役は window に一人だけ配置！（これで競合しない）
        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
    },

    // ====== 修正 1: ドロップゾーン判定（中心基準版） ======
    handleSortableDrag(e) {
        const target = this.dragState.target;
        
        // ★追加: カードの中心座標を計算するの！
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + (rect.width / 2);
        const centerY = rect.top + (rect.height / 2);

        // 下の要素を覗き見る
        target.style.visibility = 'hidden'; 
        
        // ★変更: マウス(e.client)ではなく、中心(center)で判定！
        let elemBelow = document.elementFromPoint(centerX, centerY);
        
        target.style.visibility = 'visible'; 

        // 1. 新しいゾーン候補を探す
        const newZone = elemBelow ? elemBelow.closest('.drop-zone') : null;
        const currentZone = this.dragState.activeZone;

        // --- ケースA：別の新しいゾーンに乗り換える場合 ---
        if (newZone && newZone !== currentZone) {
            if (currentZone) currentZone.classList.remove('active');
            newZone.classList.add('active');
            this.dragState.activeZone = newZone;
            return;
        }

        // --- ケースB：同じゾーンの上にいる場合 ---
        if (newZone && newZone === currentZone) {
            return; 
        }

        // --- ケースC：ゾーンが見つからない（外れた？）場合 ---
        if (!newZone && currentZone) {
            // 粘り気判定（ヒステリシス）
            const zoneRect = currentZone.getBoundingClientRect();
            const zoneX = zoneRect.left; 
            const zoneY = zoneRect.top + zoneRect.height / 2;
            
            // ★変更: ここも「マウスとの距離」ではなく「カード中心との距離」にするのが自然！
            const dist = Math.sqrt((centerX - zoneX) ** 2 + (centerY - zoneY) ** 2);
            
            const threshold = 80; 

            if (dist > threshold) {
                currentZone.classList.remove('active');
                this.dragState.activeZone = null;
            }
        }
    },
    // ★新機能：一番近いスロットを計算する関数
    getClosestSlot(slots, x, y) {
        let closestSlot = null;
        let minDistance = Infinity;

        slots.forEach(slot => {
            const rect = slot.getBoundingClientRect();
            // スロットの中心座標
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // マウスとの距離（三平方の定理：√(dx^2 + dy^2) だか、比較だけならルート不要）
            const dist = (x - centerX) ** 2 + (y - centerY) ** 2;

            if (dist < minDistance) {
                minDistance = dist;
                closestSlot = slot;
            }
        });

        return closestSlot;
    },

    // プレースホルダー（挿入ガイド）を表示・移動させる
    updatePlaceholder(slot, mouseX) {
        // すでにプレースホルダーがあれば取得、なければ作る
        let placeholder = document.getElementById('drop-placeholder');
        if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.id = 'drop-placeholder';
            placeholder.className = 'drop-placeholder';
        }

        // マウスのX座標をもとに、どのカードの前に挿入すべきか計算
        const afterElement = this.getDragAfterElement(slot, mouseX);

        if (afterElement) {
            // そのカードの前にプレースホルダーを挿入
            slot.insertBefore(placeholder, afterElement);
        } else {
            // 右端（末尾）に追加
            slot.appendChild(placeholder);
        }
    },

    // プレースホルダーを削除する
    removePlaceholder() {
        const placeholder = document.getElementById('drop-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    },

    // ★重要：マウス位置から「挿入すべき位置の後ろにある要素」を探す計算
    getDragAfterElement(slot, x) {
        // スロットの中にあるカード（ドラッグ中の自分と、プレースホルダー以外）を取得
        const draggableElements = [...slot.querySelectorAll('.math-card:not(.dragging)')];

        // reduceを使って、マウス位置に一番近い要素を探す
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // カードの中心点とマウスの距離
            const offset = x - box.left - box.width / 2;
            
            // offsetがマイナス（カードの左側にいる）かつ、一番近いものを選ぶ
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },



    startDrag(e, element, cardInstance) {
        this.commitInput(); 

        const state = this.dragState;
        state.isDragging = true;
        state.hasMoved = false; 
        state.target = element;
        state.cardInstance = cardInstance;
        state.originalParent = element.parentElement; 

        // ★追加：元の座標をメモしておく！
        state.originalLeft = element.style.left;
        state.originalTop = element.style.top;

        // 1. サイズ計測
        const rect = element.getBoundingClientRect();
        const originalW = element.offsetWidth;
        const originalH = element.offsetHeight;

        // ====== ★ここが修正ポイント！ ======
        // マウス(e)かタッチ(e)かを自動判定して、正しい座標をもらう
        const pos = this.getEventPos(e); 

        // e.clientX ではなく pos.x を使う！
        state.offsetX = pos.x - rect.left;
        state.offsetY = pos.y - rect.top;
        // =================================

        this.createDropZones(element);

        // 3. 身代わり作成
        if (state.originalParent.classList.contains('card-slot')) {
            const spacer = document.createElement('div');
            spacer.className = 'ghost-spacer';
            spacer.style.width = `${rect.width}px`;   
            spacer.style.height = `${rect.height}px`; 
            state.originalParent.insertBefore(spacer, element);
            state.ghostSpacer = spacer;
        }

        // bodyへ移動
        document.body.appendChild(element); 
        
        element.style.position = 'fixed';
        element.style.margin = '0';
        element.style.zIndex = '9999'; 

        // 座標セット
        const diffX = (rect.width - originalW) / 2;
        const diffY = (rect.height - originalH) / 2;

        element.style.left = `${rect.left + diffX}px`; 
        element.style.top = `${rect.top + diffY}px`;

        element.classList.add('dragging');
    },


    updateDragPosition(e) {
        const { target, offsetX, offsetY } = this.dragState;
        this.dragState.hasMoved = true;

        // ====== ★ここが修正ポイント！ ======
        // ここでも翻訳機を通すの！
        const pos = this.getEventPos(e);

        // e.clientX ではなく pos.x を使う
        const newLeft = pos.x - offsetX;
        const newTop = pos.y - offsetY;
        // =================================
        
        target.style.left = `${newLeft}px`;
        target.style.top = `${newTop}px`;
    },

    endDrag() {
        try {
            const { target, activeZone, ghostSpacer, hasMoved } = this.dragState;
            
            target.classList.remove('dragging');
            target.classList.remove('hover-active');
            
            // ドラッグ中の補正リセット
            target.style.margin = '0 2px'; 
            target.style.transform = ''; 

            // ====== A. スロット（Drop Zone）へのドロップ ======
            if (activeZone) {
                const parentSlot = activeZone.parentElement;
                parentSlot.insertBefore(target, activeZone);
                
                target.style.position = 'static';
                target.style.left = '';
                target.style.top = '';
                target.style.transform = 'scale(0.9)';
                target.style.margin = '';

                this.setFocus(parentSlot);
            } 
            // ====== B. それ以外（フィールド or 待機エリア） ======
            else {
                const waitArea = document.getElementById(WAIT_AREA_ID);
                const field = document.getElementById(FIELD_ID);
                
                // カードの中心座標
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const waitRect = waitArea.getBoundingClientRect();

                // ★判定：待機エリアの中に落としたか？
                const isInWaitArea = (
                    centerX >= waitRect.left && 
                    centerX <= waitRect.right &&
                    centerY >= waitRect.top && 
                    centerY <= waitRect.bottom
                );

                if (isInWaitArea) {
                    // --- 待機エリアへ移動 ---
                    waitArea.appendChild(target);
                    
                    const relX = rect.left - waitRect.left;
                    const relY = rect.top - waitRect.top + waitArea.scrollTop; 

                    target.style.position = 'absolute';
                    target.style.left = `${relX}px`;
                    target.style.top = `${relY}px`;
                    target.style.transform = 'scale(0.7)'; 
                    this.clearFocus();
                    this.log("Moved to Wait Area");

                } else {
                    // --- 計算フィールドへ移動（または復帰） ---
                    
                    // ケース1: ドラッグして移動した場合
                    if (hasMoved) {
                        field.appendChild(target);
                        
                        const fieldRect = field.getBoundingClientRect();
                        const relX = rect.left - fieldRect.left + field.scrollLeft;
                        const relY = rect.top - fieldRect.top + field.scrollTop;

                        target.style.position = 'absolute';
                        target.style.left = `${relX}px`;
                        target.style.top = `${relY}px`;
                        target.style.transform = ''; 
                        target.style.zIndex = '';
                        
                        this.log("Moved to Field");
                    } 
                    // ケース2: 移動していない場合（クリックのみ）
                    else {
                        if (ghostSpacer) {
                            // (a) スロット内にいた場合 -> スペーサーと入れ替え
                            ghostSpacer.parentElement.replaceChild(target, ghostSpacer);
                            target.style.position = 'static';
                            target.style.left = '';
                            target.style.top = '';
                            target.style.transform = 'scale(0.9)';
                        } else {
                            // (b) フィールド直下にいた場合 -> ★ここが修正ポイント！
                            
                            // とにかく実家（フィールド）に戻す
                            field.appendChild(target);

                            // 「再計算」はせずに、「メモしておいた元の座標」をそのまま復元！
                            target.style.position = 'absolute';
                            target.style.left = this.dragState.originalLeft; // ★メモ使用
                            target.style.top = this.dragState.originalTop;   // ★メモ使用
                            target.style.transform = ''; 
                            target.style.zIndex = '';
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Drop Error:", error);
        } finally {
            if (this.dragState.ghostSpacer) {
                this.dragState.ghostSpacer.remove();
                this.dragState.ghostSpacer = null;
            }
            this.clearDropZones();
            this.dragState.isDragging = false;
            this.dragState.target = null;
            this.dragState.activeZone = null;
            this.dragState.hasMoved = false; 
            
            // メモも消去（念のため）
            this.dragState.originalLeft = null;
            this.dragState.originalTop = null;
            this.updateAllMinusStyles();
        }
    },

    // 設定をブラウザの「ローカルストレージ」から読み込む

    loadConfig() {
        const data = localStorage.getItem('math-card-config');
        if (data) {
            try {
                const config = JSON.parse(data);
                if (typeof config.autoResetNegative !== 'undefined') this.state.configAutoResetNegative = config.autoResetNegative;
                if (typeof config.showHints !== 'undefined') this.state.configShowHints = config.showHints;
                if (typeof config.showInfo !== 'undefined') this.state.configShowInfo = config.showInfo;
                
                if (config.appMode) this.state.appMode = config.appMode;

                if (config.displayMode) this.state.displayMode = config.displayMode;
                if (config.fractionMode) this.state.fractionMode = config.fractionMode;

                if (config.accordionState) {
                    this.state.accordionState = config.accordionState;
                }

                this.log("Config Loaded from Storage");
            } catch (e) { console.error("Config Load Error", e); }
        }
    },

    // 現在の設定を保存する
    saveConfig() {
        const config = {
            autoResetNegative: this.state.configAutoResetNegative,
            showHints: this.state.configShowHints,
            showInfo: this.state.configShowInfo,
            
            appMode: this.state.appMode,

            displayMode: this.state.displayMode,
            fractionMode: this.state.fractionMode,
            accordionState: this.state.accordionState || {}
        };
        localStorage.setItem('math-card-config', JSON.stringify(config));
    },

// 全てのスロットの隙間に「物理的な棒（ドロップゾーン）」を配置する
 
    createDropZones(draggedElement) {
        const slots = document.querySelectorAll('.card-slot');
        
        slots.forEach(slot => {
            // 待機エリア内のスロットには、ドロップゾーンを作らない！
            if (slot.closest('#wait-area')) {
                return; // ここで処理を打ち切って、次のスロットへ
            }
            // まず既存の中身を配列として取得（ドラッグ中の要素は除外）
            const children = [...slot.childNodes].filter(node => 
                node !== draggedElement && 
                node.nodeType === 1 && // 要素ノードのみ
                !node.classList.contains('drop-placeholder') // プレースホルダー除外
            );

            // いったんスロットの中身をクリアするわけにはいかない（イベント消えるから）。
            // insertBefore を駆使して「隙間」にねじ込むわ。

            // 1. まず「先頭」にゾーンを追加
            const firstZone = document.createElement('div');
            firstZone.className = 'drop-zone';
            slot.prepend(firstZone);

            // 2. 各要素の「後ろ」に追加
            children.forEach(child => {
                const zone = document.createElement('div');
                zone.className = 'drop-zone';
                // child の直後に zone を挿入
                // (child.nextSibling の前に挿入すればよい)
                slot.insertBefore(zone, child.nextSibling);
            });
        });
    },

    // ドロップゾーンを全部消す（掃除）
    clearDropZones() {
        const zones = document.querySelectorAll('.drop-zone');
        zones.forEach(z => z.remove());
    },

    snapToSlot(cardElement, slotElement) {
        slotElement.appendChild(cardElement);
        cardElement.style.position = 'static';
        cardElement.style.left = '';
        cardElement.style.top = '';
        cardElement.style.transform = 'scale(0.9)'; 
    },

    // ====== script.js : 新しいメソッドを追加 ======

    // 待機エリアのボタン機能（整列・ゴミ箱）

    // ====== script.js : setupWaitAreaButtons (書き換え) ======

    setupWaitAreaButtons() {
        const btnSort = document.getElementById('btn-sort-wait');
        const btnClear = document.getElementById('btn-clear-wait');
        
        // 追加した要素を取得
        const confirmBox = document.getElementById('wait-clear-confirm');
        const btnYes = document.getElementById('btn-clear-yes');
        const btnNo = document.getElementById('btn-clear-no');
        
        const waitArea = document.getElementById(WAIT_AREA_ID);

        // 要素が足りなければ何もしない（安全策）
        if (!btnSort || !btnClear || !waitArea || !confirmBox || !btnYes || !btnNo) return;

        // --- 整列ボタン (変更なし) ---
        btnSort.onclick = () => {
            const cards = Array.from(waitArea.children).filter(child => child.classList.contains('math-card'));
            if (cards.length === 0) return;

            const getScore = (card) => {
                const type = card.type; 
                if (card.classList.contains('container-root') || 
                    card.classList.contains('container-fraction') || 
                    card.classList.contains('container-sqrt') || 
                    card.classList.contains('container-power') ||
                    card.innerText.includes('(')) {
                    return 10; 
                }
                if (card.classList.contains('card-number') || type === 'variable') {
                    return 20; 
                }
                return 30; 
            };

            cards.sort((a, b) => getScore(a) - getScore(b));

            cards.forEach(card => {
                waitArea.appendChild(card);
                card.style.position = 'static'; 
                card.style.margin = '-10px'; 
                card.style.transform = 'scale(0.7)';
                card.style.left = '';
                card.style.top = '';
            });

            this.log("Wait Area: Sorted");
        };

        // --- ★変更：ゴミ箱ボタン（確認モードへ移行） ---
        btnClear.onclick = () => {
            const cards = waitArea.querySelectorAll('.math-card');
            if (cards.length === 0) return; // 空なら何もしない

            // ゴミ箱ボタンを隠して、確認ボックスを表示
            btnClear.classList.add('hidden');
            confirmBox.classList.remove('hidden');
        };

        // --- 削除実行 (Yes) ---
        btnYes.onclick = () => {
            const cards = waitArea.querySelectorAll('.math-card');
            cards.forEach(card => card.remove());
            this.log("Wait Area: Cleared");

            // 元に戻す
            resetClearButton();
        };

        // --- キャンセル (No) ---
        btnNo.onclick = () => {
            // 何もせず元に戻す
            resetClearButton();
        };

        // 状態をリセットする関数
        const resetClearButton = () => {
            confirmBox.classList.add('hidden');
            btnClear.classList.remove('hidden');
        };
    },

    // ====== 複製機能のためのヘルパーメソッド ======

    // A. DOM要素から「カードの種類と値」を鑑定する関数
    identifyCardType(element) {
        const cl = element.classList;
        
        if (cl.contains('container-fraction')) return { type: 'structure', value: '分数' };
        if (cl.contains('container-root'))     return { type: 'root', value: 'Root' };
        if (cl.contains('container-power'))    return { type: 'power', value: 'Power' };
        if (cl.contains('container-sqrt'))     return { type: 'operator', value: '√' };
        
        // 記号コンテナの場合、中身の文字で判定
        if (cl.contains('container-symbol')) {
            if (element.innerText.includes('|')) return { type: 'structure', value: '|x|' };
            if (element.innerText.includes('(')) return { type: 'structure', value: '( )' };
        }

        // 数字・変数・演算子
        const text = element.innerText;

        if (cl.contains('card-number')) {
            // ★変更点：ここは純粋な数字だけが来るはず
             return { type: 'number', value: text };
        }
        
        // ★追加点：変数クラスなら変数として判定
        if (cl.contains('card-variable')) {
            return { type: 'variable', value: text };
        }

        if (cl.contains('card-operator')) return { type: 'operator', value: text };

        // デフォルト（エラー回避）
        return { type: 'number', value: text };
    },

    // B. 木構造を再帰的にコピーする関数
    duplicateTree(sourceElement) {
        // 1. 元のカードの正体を暴く
        const info = this.identifyCardType(sourceElement);
        
        // 2. 新しいカードをメモリ上で作成（座標はあとで決めるので 0,0）
        // ※ spawnCard は使わず、直接 new することで余計な配置ロジックを回避
        const newCard = new MathCard(info.type, info.value, 0, 0);

        // 3. 中身（スロット）にある子供たちも連れて行く（再帰処理）
        // 元のカードのスロット一覧
        const sourceSlots = sourceElement.querySelectorAll(':scope > .card-slot, :scope > .fraction-part > .card-slot, :scope > .root-slot');
        // 新しいカードのスロット一覧（構造は同じはずなので、順番通りに対応させる）
        const newSlots = newCard.element.querySelectorAll(':scope > .card-slot, :scope > .fraction-part > .card-slot, :scope > .root-slot');

        // スロットの数だけループ
        sourceSlots.forEach((sourceSlot, index) => {
            const targetSlot = newSlots[index];
            if (!targetSlot) return;

            // スロットの中にある「カード」だけを抽出（ドロップゾーンとかは無視）
            const children = Array.from(sourceSlot.children).filter(c => c.classList.contains('math-card'));

            children.forEach(childEl => {
                // ★ここで自分自身を呼び出す（再帰！）
                const clonedChildInstance = this.duplicateTree(childEl);
                
                // クローンできた子供を、新しいカードのスロットに入れる
                if (clonedChildInstance) {
                    targetSlot.appendChild(clonedChildInstance.element);
                    
                    // スタイルを「中に入った状態」にする
                    clonedChildInstance.element.style.position = 'static';
                    clonedChildInstance.element.style.transform = 'scale(0.9)';
                    clonedChildInstance.element.style.margin = '0 2px';
                    
                    // 指数（Power）の中身なら、スタイル調整が必要かも？
                    // (CSSで .exponent-slot .math-card { ... } が効くから大丈夫なはず！)
                }
            });
        });

        // インスタンスを返す
        return newCard;
    },



    // モードを切り替えて保存・UI反映する
    setAppMode(mode) {
        // 1. ステート更新
        this.state.appMode = mode;

        // 計算エンジン側にもモード変更を即座に伝える！
        if (typeof MathEngine !== 'undefined') {
            MathEngine.config.mode = mode;
        }

        // ログ出力
        if (mode === 'arithmetic') {
            this.log("Mode: Arithmetic (算数)");
        } else {
            this.log("Mode: Math (数学)");
        }

        // 2. 設定保存
        this.saveConfig();
        
        // ※ボタンの見た目は setupModeButtons の updateLabel で管理しているので、ここには書かなくてOK！
    },


    // ====== カメレオン機能：マイナス記号の色分けロジック ======
    updateAllMinusStyles() {
        // 1. 画面内のすべてのマイナス演算子カードを探す
        const minusCards = document.querySelectorAll('.card-operator');

        minusCards.forEach(card => {
            if (card.innerText !== '-') return; // マイナス以外は無視

            const slot = card.parentElement;

            // ★変更点：スロットの中にいるか判定
            if (slot && slot.classList.contains('card-slot')) {
                // --- A. スロットの中にいる場合（周りの空気を読む） ---

                // 兄弟カードを取得
                const siblings = Array.from(slot.children).filter(c => 
                    c.classList.contains('math-card') && 
                    !c.classList.contains('ghost-spacer') &&
                    !c.classList.contains('dragging')
                );

                const myIndex = siblings.indexOf(card);
                let isUnary = false;

                if (myIndex === 0) {
                    // 先頭なら負の符号
                    isUnary = true;
                } else {
                    const prevCard = siblings[myIndex - 1];
                    const isPrevOperator = prevCard.classList.contains('card-operator');
                    
                    if (isPrevOperator) {
                        // 前が演算子なら負の符号
                        isUnary = true;
                    } else {
                        // それ以外なら引き算
                        isUnary = false;
                    }
                }

                // クラスの付け外し
                if (isUnary) {
                    card.classList.add('unary-minus');
                } else {
                    card.classList.remove('unary-minus');
                }

            } else {
                // --- B. フィールド（または待機エリア）にいる場合 ---
                // ★追加：ここでは必ず「赤（引き算）」に戻す！
                card.classList.remove('unary-minus');
            }
        });
    }

};

window.onload = () => App.init();

// ====== フィールドのドラッグスクロール機能ブロック (修正版) ======
document.addEventListener('DOMContentLoaded', () => {
    const scrollContainer = document.getElementById('calc-field'); 

    if (scrollContainer) {
        let isDown = false;
        let startX;
        let startY;
        let scrollLeft;
        let scrollTop;

        scrollContainer.addEventListener('mousedown', (e) => {
            // カード本体、またはボタンなどをクリックしたときは、画面ドラッグしない
            if (e.target.closest('.math-card') || e.target.closest('button') || e.target.closest('.resize-handle')) {
                return; 
            }

            isDown = true;
            scrollContainer.classList.add('is-dragging'); 
            
            // 開始位置を記録
            startX = e.pageX - scrollContainer.offsetLeft;
            startY = e.pageY - scrollContainer.offsetTop;
            
            scrollLeft = scrollContainer.scrollLeft;
            scrollTop = scrollContainer.scrollTop;
        });

        // タッチ開始
        scrollContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.math-card') || e.target.closest('button') || e.target.closest('.resize-handle')) {
                return; 
            }
            isDown = true;
            scrollContainer.classList.add('is-dragging');
            
            // タッチ座標取得
            startX = e.touches[0].pageX - scrollContainer.offsetLeft;
            startY = e.touches[0].pageY - scrollContainer.offsetTop;
            scrollLeft = scrollContainer.scrollLeft;
            scrollTop = scrollContainer.scrollTop;
        });

        scrollContainer.addEventListener('mouseleave', () => {
            isDown = false;
            scrollContainer.classList.remove('is-dragging');
        });

        // タッチ終了
        scrollContainer.addEventListener('touchend', () => {
            isDown = false;
            scrollContainer.classList.remove('is-dragging');
        });

        scrollContainer.addEventListener('mouseup', () => {
            isDown = false;
            scrollContainer.classList.remove('is-dragging');
        });

        scrollContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            
            const x = e.pageX - scrollContainer.offsetLeft;
            const y = e.pageY - scrollContainer.offsetTop;
            
            const walkX = (x - startX) * 1.5; 
            const walkY = (y - startY) * 1.5; 
            
            // スクロール位置を更新
            scrollContainer.scrollLeft = scrollLeft - walkX;
            scrollContainer.scrollTop = scrollTop - walkY;
        });

        // タッチ移動
        scrollContainer.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            if(e.cancelable) e.preventDefault(); // スクロール防止

            const x = e.touches[0].pageX - scrollContainer.offsetLeft;
            const y = e.touches[0].pageY - scrollContainer.offsetTop;
            
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            
            scrollContainer.scrollLeft = scrollLeft - walkX;
            scrollContainer.scrollTop = scrollTop - walkY;
        }, { passive: false });


    }
});
// ====== フィールドのドラッグスクロール機能ブロック (終了) ======