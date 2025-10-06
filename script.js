const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
let board;
let currentPlayer;

const boardElement = document.getElementById('othello-board');
const messageElement = document.getElementById('message');
const scoreElement = document.getElementById('score');
const resetButton = document.getElementById('reset-button');

// 8方向の差分
const DIRECTIONS = [
    {dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}, // 上下左右
    {dr: -1, dc: -1}, {dr: -1, dc: 1}, {dr: 1, dc: -1}, {dr: 1, dc: 1}  // 斜め
];

// ゲームの初期化
function initializeGame() {
    board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY));
    // 初期配置 (中央の4マス)
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    currentPlayer = BLACK;
    renderBoard();
    updateScore();
}

/**
 * 指定された(r, c)にplayerの駒を置いたときに裏返せる駒の座標リストを取得する。
 * 有効な手でなければ空のリストを返す。
 * @param {number} r 行
 * @param {number} c 列
 * @param {number} player プレイヤー (BLACK or WHITE)
 * @returns {Array<{r: number, c: number}>} 裏返せる駒の座標リスト
 */
function getFlippablePieces(r, c, player) {
    // 既に駒があるか、盤面外なら無効
    if (board[r][c] !== EMPTY || r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
        return [];
    }

    const opponent = player === BLACK ? WHITE : BLACK;
    let flippable = [];
    
    DIRECTIONS.forEach(({dr, dc}) => {
        let line = [];
        let nr = r + dr;
        let nc = c + dc;
        
        while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            const current = board[nr][nc];
            
            if (current === EMPTY) {
                line = []; // 空きマスがあれば、そこでラインは途切れる
                break;
            } else if (current === opponent) {
                line.push({r: nr, c: nc}); // 相手の駒を一時的に保存
            } else if (current === player) {
                // 自分の駒を見つけた場合、lineに保存されていた相手の駒が裏返せる
                flippable.push(...line); 
                break;
            }
            
            nr += dr;
            nc += dc;
        }
    });

    return flippable;
}

/**
 * 現在のプレイヤーが置けるすべての有効な手の座標リストを取得する。
 * @param {number} player プレイヤー (BLACK or WHITE)
 * @returns {Array<{r: number, c: number}>} 有効な手の座標リスト
 */
function getValidMoves(player) {
    const validMoves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            // 裏返せる駒が1つでもあれば、そこは有効な手である
            if (getFlippablePieces(r, c, player).length > 0) {
                validMoves.push({r, c});
            }
        }
    }
    return validMoves;
}

// 盤面を描画
function renderBoard() {
    boardElement.innerHTML = ''; 
    const validMoves = getValidMoves(currentPlayer);
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = r;
            square.dataset.col = c;

            // 有効な手であるかチェック
            const isValid = validMoves.some(move => move.r === r && move.c === c);

            if (isValid) {
                square.classList.add('valid-move', 'clickable');
                square.addEventListener('click', () => handleMove(r, c));
            } else {
                // 有効な手ではないマスにはイベントリスナーを付けない（または非活性にする）
            }

            if (board[r][c] !== EMPTY) {
                const disc = document.createElement('div');
                disc.classList.add('disc', board[r][c] === BLACK ? 'black' : 'white');
                square.appendChild(disc);
            }
            
            boardElement.appendChild(square);
        }
    }
    
    checkGameStatus(validMoves);
}

// 駒を置く処理と裏返し処理
function handleMove(r, c) {
    // getFlippablePiecesは、このマスが有効な手であることを確認するのにも使える
    const flippable = getFlippablePieces(r, c, currentPlayer);

    if (flippable.length > 0) {
        // 駒を置く
        board[r][c] = currentPlayer;

        // 駒を裏返す
        flippable.forEach(pos => {
            board[pos.r][pos.c] = currentPlayer;
        });

        // ターン切り替え
        switchTurn();
    }
}

// スコア表示を更新
function updateScore() {
    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === BLACK) blackCount++;
            else if (board[r][c] === WHITE) whiteCount++;
        }
    }
    scoreElement.textContent = `黒: ${blackCount} | 白: ${whiteCount}`;
}

// ターン切り替えとゲーム進行の制御
function switchTurn() {
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    renderBoard(); // 次のターンに移り、盤面を再描画
}

// ゲームの状態チェック（パスや終局の判定）
function checkGameStatus(currentValidMoves) {
    updateScore(); // スコアを先に更新

    if (currentValidMoves.length === 0) {
        // 現在のプレイヤーが打てる手がない場合
        const nextPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        const nextValidMoves = getValidMoves(nextPlayer);

        if (nextValidMoves.length === 0) {
            // 両プレイヤーとも打てる手がない -> 終局
            endGame();
            return;
        } else {
            // 現在のプレイヤーはパス
            const playerColor = currentPlayer === BLACK ? '黒' : '白';
            messageElement.textContent = `${playerColor}はパスです。${nextPlayer === BLACK ? '黒' : '白'}の番になります。`;
            setTimeout(() => {
                currentPlayer = nextPlayer; // ターンをスキップ
                renderBoard();
            }, 1000); // 1秒後に自動でターン切り替え
            return;
        }
    }

    // 通常のターンメッセージ
    const playerColor = currentPlayer === BLACK ? '黒' : '白';
    messageElement.textContent = `${playerColor}の番です。`;
}

// 終局処理
function endGame() {
    // 最終スコアを計算
    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === BLACK) blackCount++;
            else if (board[r][c] === WHITE) whiteCount++;
        }
    }

    let resultMessage;
    if (blackCount > whiteCount) {
        resultMessage = `ゲーム終了！黒の勝ちです (${blackCount} vs ${whiteCount}) `;
    } else if (whiteCount > blackCount) {
        resultMessage = `ゲーム終了！白の勝ちです (${whiteCount} vs ${blackCount}) `;
    } else {
        resultMessage = `ゲーム終了！引き分けです (${blackCount} vs ${whiteCount}) `;
    }
    messageElement.textContent = resultMessage;
}

// リセットボタン
resetButton.addEventListener('click', initializeGame);

// ゲーム開始
initializeGame();