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
        else if (this.type === 'operator') el.classList.add('card-operator');
        else if (this.type === 'variable') el.classList.add('card-variable');
        el.innerText = this.value;
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

// ====== アプリのメイン処理 ======
const App = {
// 状態管理
    state: {
        activeInputCard: null,    // 今編集中（入力中）のカード
        isNegativeMode: false,    // [New] 負の数入力モードかどうか
        configAutoResetNegative: true, // [New] 設定: 入力確定後に負の数モードを解除するか
        configShowHints: true,  // ヒントを表示するかどうか
        configShowInfo: false,  // 情報ウィンドウを表示するかどうか
        appMode: 'arithmetic',  // ★追加: アプリのモード ('arithmetic' か 'math')
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
        this.updateAllMinusStyles();
        console.log("Math Card Canvas: Ready!");
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
                
                // データ取得
                const value = btn.innerText;
                const type = btn.getAttribute('data-type');
                
                // ログに出す
                this.log(`Input: [${value}] (type: ${type})`);
                
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
        if (type === 'delete') {
            if (this.state.activeInputCard && this.state.activeInputCard.type === 'number') {
                const currentVal = this.state.activeInputCard.value.toString();
                
                // 1. 1文字削った姿をシミュレーション
                const nextVal = currentVal.slice(0, -1);

                // 2. 「空っぽ」か「マイナス記号だけ」になるなら消滅
                if (nextVal === '' || nextVal === '-') {
                    this.state.activeInputCard.element.remove();
                    this.state.activeInputCard = null;
                    this.clearFocus(); 
                    
                    // ★追加: もし負の数モード中なら、解除する！
                    if (this.state.isNegativeMode) {
                        this.state.isNegativeMode = false;
                        
                        // ボタンの見た目も戻す
                        const signBtn = document.querySelector('button[data-type="sign"]');
                        if (signBtn) signBtn.classList.remove('active');
                        
                        this.log("Backspace: Card Destroyed & Negative Mode Reset");
                    } else {
                        this.log("Backspace: Card Destroyed");
                    }
                    this.updateAllMinusStyles();

                } 
                // 3. まだ数字が残るなら更新
                else {
                    this.state.activeInputCard.updateValue(nextVal);
                    this.log("Backspace: Deleted last char");
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

            // B. ★追加: 編集中（入力中）のカードがあれば、即座に反映させる！
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
            
            // 【優先度 1】編集中なら、まず確定する
            if (this.state.activeInputCard) {
                this.commitInput(); 
                this.log("Input Committed (Enter)");
                return; // ここで一旦終了（連打判定は次のEnterで）
            }

            // 【優先度 2】直前(0.25秒以内)に数字を確定していたら、負の数トグル
            const now = Date.now();
            if (this.state.lastCommittedCard && (now - this.state.lastCommitTime < 250)) {
                
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
                    
                    this.state.lastCommitTime = 0; // リセットして連続反応防止
                    return; // 移動処理はしない
                }
            }

            // 【優先度 3】★追加実装: フォーカスの階層移動 (Ascent)
            if (this.state.activeSlot) {
                const currentSlot = this.state.activeSlot;
                
                // 今いるスロットの親（コンテナカード）を探す
                const containerCard = currentSlot.closest('.math-card');

                if (containerCard) {
                    // そのコンテナが入っている「さらに親のスロット」があるか？
                    const parentSlot = containerCard.parentElement;

                    if (parentSlot && parentSlot.classList.contains('card-slot')) {
                        // 親スロットへ移動！
                        this.setFocus(parentSlot);
                        this.log("Focus: Ascended to Parent");
                    } else {
                        // 親がいない（トップレベル）なら、フォーカス解除
                        this.clearFocus();
                        this.log("Focus: Cleared (Top Level)");
                    }
                } else {
                    // 万が一コンテナが見つからない場合も解除
                    this.clearFocus();
                }
                return;
            }

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

            if (value.includes('^') || type === 'power') {
                this.spawnCard('power', 'Power', 100, 100);
                return;
            }
            if (value.includes('式')) {
                this.spawnCard('root', 'Root', 50, 50);
            } else {
                this.spawnCard(type, value, 100, 100);
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
        headers.forEach(header => {
            header.onclick = () => {
                header.classList.toggle('closed');
                let nextElem = header.nextElementSibling;
                while (nextElem && !nextElem.classList.contains('grid-head')) {
                    nextElem.classList.toggle('hidden-btn');
                    nextElem = nextElem.nextElementSibling;
                }
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


    // ====== spawnCard の書き換え（スクロール追従版） ======
    spawnCard(type, value, x, y) { 
        let targetParent = document.getElementById(FIELD_ID);
        let isAbsolute = true;
        let finalX = x;
        let finalY = y;

        // ★ロジック変更: フォーカスがある場合 (ここはそのまま)
        if (this.state.activeSlot) {
            targetParent = this.state.activeSlot;
            isAbsolute = false; // スロット内は static 配置
        } 
        // ★ロジック変更: フォーカスがない場合（基本生成場所）
        else {
            // 1. 今の画面のスクロール位置を取得
            const scrollLeft = targetParent.scrollLeft;
            const scrollTop = targetParent.scrollTop;

            // コンテナ系かどうかを判定
            const isContainer = 
                type === 'structure' || 
                type === 'root' || 
                type === 'power' || 
                ['分数', '√', '|x|', '( )'].includes(value);

            const cursor = this.state.spawnCursor;
            const stepX = 25; // 右にずらす量

            // 2. カーソルが「今の画面」から置いてけぼりになっていないかチェック！
            // (現在予定されているY座標と、今の画面のY座標のズレが 100px 以上あったらリセット)
            
            // 比較対象のカーソルY
            let currentCursorY = isContainer ? cursor.structY : cursor.normalY;

            // 画面の上端（scrollTop）と比較して、大きくズレていたらカーソルを現在地に持ってくる
            // "50" は余白（マージン）なの。
            if (Math.abs(currentCursorY - (scrollTop + 50)) > 100) {
                // リセット発動！
                if (isContainer) {
                    cursor.structX = scrollLeft + 50;
                    cursor.structY = scrollTop + 150; // コンテナはちょっと下
                } else {
                    cursor.normalX = scrollLeft + 50;
                    cursor.normalY = scrollTop + 50;
                }
                this.log("Cursor: Followed View"); // ログに出してみる
            }
            
            // 3. 座標を決定
            if (isContainer) {
                // 下の段に配置
                finalX = cursor.structX;
                finalY = cursor.structY;
                cursor.structX += stepX;
            } else {
                // 上の段に配置
                finalX = cursor.normalX;
                finalY = cursor.normalY;
                cursor.normalX += stepX;
            }
        }

        // カードインスタンス作成
        const card = new MathCard(type, value, finalX, finalY);
        targetParent.appendChild(card.element);

        // 配置スタイルの適用
        if (!isAbsolute) {
            card.element.style.position = 'static';
            card.element.style.left = '';
            card.element.style.top = '';
            card.element.style.transform = 'scale(0.9)';
            card.element.style.margin = '0 2px';         
        } else {
            // absoluteの場合のみ座標セット
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
    setupResizer() {
        const handle = document.getElementById('resize-handle');
        const waitArea = document.getElementById('wait-area');
        const mainArea = document.querySelector('.main-area'); // 全体の高さ基準

        if (!handle || !waitArea) return;

        let isResizing = false;

        // 1. ドラッグ開始
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            handle.classList.add('active'); // 色を変える
            document.body.style.cursor = 'row-resize'; // 画面全体のカーソル固定
            document.body.style.userSelect = 'none';   // 文字選択防止
        });

        // 2. ドラッグ中（マウスを動かした）
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // マウスのY座標から、待機エリアの高さを計算
            // (ウィンドウの高さ - マウスのY座標)
            const newHeight = window.innerHeight - e.clientY;

            // 制限（最小 100px 〜 最大 画面の半分まで）
            if (newHeight > 100 && newHeight < window.innerHeight * 0.6) {
                waitArea.style.height = `${newHeight}px`;
            }
        });

        // 3. ドラッグ終了
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
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
        
        element.style.position = 'absolute';
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
                
                // ★追加: モードの読み込み
                if (config.appMode) this.state.appMode = config.appMode;

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
            
            // ★追加: モードの保存
            appMode: this.state.appMode
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


    // モードボタンのイベント設定
    setupModeButtons() {
        const btnArith = document.getElementById('btn-mode-arithmetic');
        const btnMath = document.getElementById('btn-mode-math');

        if (btnArith) {
            btnArith.onclick = () => this.setAppMode('arithmetic');
        }
        if (btnMath) {
            btnMath.onclick = () => this.setAppMode('math');
        }
    },

    // モードを切り替えて保存・UI反映する
    setAppMode(mode) {
        // 1. ステート更新
        this.state.appMode = mode;

        // 2. UI更新（排他制御）
        const btnArith = document.getElementById('btn-mode-arithmetic');
        const btnMath = document.getElementById('btn-mode-math');

        if (btnArith && btnMath) {
            if (mode === 'arithmetic') {
                btnArith.classList.add('active');
                btnMath.classList.remove('active');
                this.log("Mode: Arithmetic (算数)");
            } else {
                btnArith.classList.remove('active');
                btnMath.classList.add('active');
                this.log("Mode: Math (数学)");
            }
        }

        // 3. 設定保存
        this.saveConfig();
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