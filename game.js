// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const livesElement = document.getElementById('livesValue');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');

// ゲーム状態
let gameState = {
    score: 0,
    lives: 3,
    level: 1, // 常に1から開始
    gameRunning: true,
    keys: {},
    lastTime: 0,
    aliensKilled: 0,
    totalAliensInLevel: 0,
    levelStartTime: 0,
    levelCompleting: false // レベルクリア処理中フラグを追加
};

// プレイヤー
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 30,
    speed: 3,
    color: '#00ff00'
};

// 弾丸配列
let bullets = [];
let enemyBullets = [];

// エイリアン配列
let aliens = [];

// エイリアンアニメーション用
let alienAnimationFrame = 0;

// エイリアンの設定
const alienConfig = {
    rows: 2,
    cols: 4,
    width: 30,
    height: 20,
    spacing: 40,
    speed: 0.3,
    direction: 1,
    dropDistance: 12,
    shootChance: 0.0001
};

// パーティクル効果用
let particles = [];

// 防壁システム
let barriers = [];

// 防壁の設定
const barrierConfig = {
    count: 4,
    width: 80,
    height: 60,
    blockSize: 4,
    y: canvas.height - 200,
    spacing: 160
};

// ゲーム初期化
function initGame() {
    console.log('=== GAME INITIALIZATION ===');
    
    // 基本状態をリセット
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1; // 必ず1から開始
    gameState.gameRunning = true;
    gameState.aliensKilled = 0;
    gameState.levelStartTime = Date.now();
    gameState.levelCompleting = false; // フラグをリセット
    
    console.log(`Game initialized - Level: ${gameState.level}`);
    
    bullets = [];
    enemyBullets = [];
    aliens = [];
    particles = [];
    barriers = [];
    
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 60;
    player.speed = 3;
    
    // レベル1用の設定
    setLevelDifficulty(1);
    createAliens();
    createBarriers();
    updateUI();
    gameOverScreen.style.display = 'none';
}

// レベル別難易度設定
function setLevelDifficulty(level) {
    console.log(`=== SET LEVEL DIFFICULTY ===`);
    console.log(`Input level: ${level} (type: ${typeof level})`);
    
    // レベルが数値でない場合や異常値の場合は1にリセット
    if (typeof level !== 'number' || isNaN(level) || level < 1 || level > 100) {
        console.error(`Invalid level detected: ${level}, resetting to 1`);
        level = 1;
        gameState.level = 1;
    }
    
    // レベル1-10: 初心者向け
    if (level <= 10) {
        alienConfig.rows = Math.min(2 + Math.floor(level / 3), 3);
        alienConfig.cols = Math.min(4 + Math.floor(level / 2), 8);
        alienConfig.speed = 0.3 + (level - 1) * 0.1;
        alienConfig.shootChance = 0.0001 + (level - 1) * 0.00005;
        alienConfig.dropDistance = 12;
        console.log(`Level ${level}: Beginner tier`);
    }
    // レベル11-30: 中級者向け
    else if (level <= 30) {
        alienConfig.rows = Math.min(3 + Math.floor((level - 10) / 5), 5);
        alienConfig.cols = Math.min(6 + Math.floor((level - 10) / 3), 10);
        alienConfig.speed = 1.0 + (level - 11) * 0.15;
        alienConfig.shootChance = 0.0006 + (level - 11) * 0.00008;
        alienConfig.dropDistance = 15;
        console.log(`Level ${level}: Intermediate tier`);
    }
    // レベル31-60: 上級者向け
    else if (level <= 60) {
        alienConfig.rows = Math.min(4 + Math.floor((level - 30) / 6), 6);
        alienConfig.cols = Math.min(8 + Math.floor((level - 30) / 4), 12);
        alienConfig.speed = 4.0 + (level - 31) * 0.2;
        alienConfig.shootChance = 0.002 + (level - 31) * 0.0001;
        alienConfig.dropDistance = 18;
        console.log(`Level ${level}: Advanced tier`);
    }
    // レベル61-100: エキスパート向け
    else {
        alienConfig.rows = Math.min(5 + Math.floor((level - 60) / 8), 8);
        alienConfig.cols = Math.min(10 + Math.floor((level - 60) / 5), 15);
        alienConfig.speed = 10.0 + (level - 61) * 0.3;
        alienConfig.shootChance = 0.005 + (level - 61) * 0.00015;
        alienConfig.dropDistance = 20;
        console.log(`Level ${level}: Expert tier`);
    }
    
    // 総エイリアン数を記録
    gameState.totalAliensInLevel = alienConfig.rows * alienConfig.cols;
    
    console.log(`Final config - rows: ${alienConfig.rows}, cols: ${alienConfig.cols}, speed: ${alienConfig.speed}, total aliens: ${gameState.totalAliensInLevel}`);
}

// エイリアンを生成
function createAliens() {
    for (let row = 0; row < alienConfig.rows; row++) {
        for (let col = 0; col < alienConfig.cols; col++) {
            aliens.push({
                x: 100 + col * alienConfig.spacing,
                y: 50 + row * alienConfig.spacing,
                width: alienConfig.width,
                height: alienConfig.height,
                alive: true,
                type: row, // 行によってタイプを変える
                lastShot: 0
            });
        }
    }
}

// 防壁を生成
function createBarriers() {
    barriers = [];
    
    for (let i = 0; i < barrierConfig.count; i++) {
        const barrier = {
            x: 100 + i * barrierConfig.spacing,
            y: barrierConfig.y,
            width: barrierConfig.width,
            height: barrierConfig.height,
            blocks: []
        };
        
        // 防壁のブロックを初期化し、道路を作る
        const blocksX = Math.floor(barrier.width / barrierConfig.blockSize);
        const blocksY = Math.floor(barrier.height / barrierConfig.blockSize);
        
        for (let y = 0; y < blocksY; y++) {
            barrier.blocks[y] = [];
            for (let x = 0; x < blocksX; x++) {
                // 下部中央に道路を作る（プレイヤーが通れるように）
                const isBottomCenter = y >= blocksY - 4 && x >= blocksX * 0.3 && x <= blocksX * 0.7;
                barrier.blocks[y][x] = !isBottomCenter;
            }
        }
        
        barriers.push(barrier);
    }
}

// キーボードイベント
document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;
    
    // スペースキーで射撃
    if (e.code === 'Space' && gameState.gameRunning) {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
});

// 射撃機能
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7,
        color: '#ffff00'
    });
}

// エイリアンの射撃
function alienShoot(alien) {
    enemyBullets.push({
        x: alien.x + alien.width / 2 - 2,
        y: alien.y + alien.height,
        width: 4,
        height: 10,
        speed: 3,
        color: '#ff4444'
    });
}

// プレイヤー更新
function updatePlayer() {
    if (!gameState.gameRunning) return;
    
    // 左右移動
    if ((gameState.keys['KeyA'] || gameState.keys['ArrowLeft']) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((gameState.keys['KeyD'] || gameState.keys['ArrowRight']) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
}

// 弾丸更新
function updateBullets() {
    // プレイヤーの弾丸
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
        
        // 画面外に出た弾丸を削除
        if (bullet.y < 0) {
            bullets.splice(i, 1);
        }
    }
    
    // 敵の弾丸
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.y += bullet.speed;
        
        // 画面外に出た弾丸を削除
        if (bullet.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

// エイリアン更新
function updateAliens(currentTime) {
    let moveDown = false;
    
    // 端に到達したかチェック
    for (let alien of aliens) {
        if (!alien.alive) continue;
        
        if ((alien.x <= 0 && alienConfig.direction === -1) || 
            (alien.x + alien.width >= canvas.width && alienConfig.direction === 1)) {
            moveDown = true;
            break;
        }
    }
    
    // 端に到達した場合、方向を変えて下に移動
    if (moveDown) {
        alienConfig.direction *= -1;
        for (let alien of aliens) {
            if (alien.alive) {
                alien.y += alienConfig.dropDistance;
            }
        }
    } else {
        // 横移動
        for (let alien of aliens) {
            if (alien.alive) {
                alien.x += alienConfig.speed * alienConfig.direction;
            }
        }
    }
    
    // ランダムでエイリアンが射撃
    for (let alien of aliens) {
        if (alien.alive && Math.random() < alienConfig.shootChance && currentTime - alien.lastShot > 1000) {
            alienShoot(alien);
            alien.lastShot = currentTime;
        }
    }
}

// 当たり判定
function checkCollisions() {
    // プレイヤーの弾丸とエイリアンの当たり判定
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = 0; j < aliens.length; j++) {
            const alien = aliens[j];
            
            if (alien.alive && 
                bullet.x < alien.x + alien.width &&
                bullet.x + bullet.width > alien.x &&
                bullet.y < alien.y + alien.height &&
                bullet.y + bullet.height > alien.y) {
                
                // 爆発エフェクト
                createExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2);
                
                // エイリアンを倒す
                alien.alive = false;
                bullets.splice(i, 1);
                gameState.aliensKilled++;
                
                // スコア加算（上の行ほど高得点）
                const baseScore = (4 - alien.type) * 10 + 10;
                const levelBonus = gameState.level * 5;
                gameState.score += baseScore + levelBonus;
                
                // 経験値システムを完全削除
                
                updateUI();
                break;
            }
        }
    }
    
    // 敵の弾丸とプレイヤーの当たり判定
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        if (bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            
            // プレイヤーがダメージを受ける
            enemyBullets.splice(i, 1);
            gameState.lives--;
            createExplosion(player.x + player.width / 2, player.y + player.height / 2);
            updateUI();
            
            if (gameState.lives <= 0) {
                gameOver();
            }
        }
    }
    
    // エイリアンがプレイヤーに到達したかチェック
    for (let alien of aliens) {
        if (alien.alive && alien.y + alien.height >= player.y) {
            gameOver();
            break;
        }
    }
    
    // 防壁との当たり判定
    checkBarrierCollisions();
    
    // 全てのエイリアンを倒したかチェック
    if (aliens.every(alien => !alien.alive) && !gameState.levelCompleting) {
        // レベルクリア（重複実行を防ぐ）
        gameState.levelCompleting = true;
        levelComplete();
    }
}

// 防壁との当たり判定
function checkBarrierCollisions() {
    // プレイヤーの弾丸と防壁
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let barrier of barriers) {
            if (checkBulletBarrierCollision(bullet, barrier)) {
                damageBarrier(barrier, bullet.x, bullet.y, 2);
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // 敵の弾丸と防壁
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        
        for (let barrier of barriers) {
            if (checkBulletBarrierCollision(bullet, barrier)) {
                damageBarrier(barrier, bullet.x, bullet.y, 2);
                enemyBullets.splice(i, 1);
                break;
            }
        }
    }
}

// 弾丸と防壁の当たり判定
function checkBulletBarrierCollision(bullet, barrier) {
    return bullet.x < barrier.x + barrier.width &&
           bullet.x + bullet.width > barrier.x &&
           bullet.y < barrier.y + barrier.height &&
           bullet.y + bullet.height > barrier.y;
}

// 防壁へのダメージ処理
function damageBarrier(barrier, hitX, hitY, damageRadius) {
    const localX = hitX - barrier.x;
    const localY = hitY - barrier.y;
    
    const blockX = Math.floor(localX / barrierConfig.blockSize);
    const blockY = Math.floor(localY / barrierConfig.blockSize);
    
    // ダメージ範囲内のブロックを破壊
    for (let dy = -damageRadius; dy <= damageRadius; dy++) {
        for (let dx = -damageRadius; dx <= damageRadius; dx++) {
            const targetX = blockX + dx;
            const targetY = blockY + dy;
            
            if (targetY >= 0 && targetY < barrier.blocks.length &&
                targetX >= 0 && targetX < barrier.blocks[targetY].length) {
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= damageRadius) {
                    barrier.blocks[targetY][targetX] = false;
                }
            }
        }
    }
    
    // 小さな爆発エフェクト
    createSmallExplosion(hitX, hitY);
}

// 小さな爆発エフェクト
function createSmallExplosion(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 15,
            maxLife: 15,
            color: `hsl(${Math.random() * 40 + 20}, 80%, 60%)`
        });
    }
}

// 爆発エフェクト
function createExplosion(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            maxLife: 30,
            color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`
        });
    }
}

// パーティクル更新
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// 描画関数
function draw() {
    // 背景クリア
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 星空エフェクト
    drawStars();
    
    // プレイヤー描画
    drawPlayer();
    
    // 弾丸描画
    drawBullets();
    
    // エイリアン描画
    drawAliens();
    
    // 防壁描画
    drawBarriers();
    
    // パーティクル描画
    drawParticles();
}

// 星空描画
function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (i * 73) % canvas.height;
            ctx.fillRect(x, y, 1, 1);
    }
}

// プレイヤー描画
function drawPlayer() {
    const x = player.x;
    const y = player.y;
    
    // グロー効果
    drawPlayerGlow(x, y);
    
    // 宇宙船のメイン構造を詳細に描画
    drawPlayerShip(x, y);
    
    // エンジン炎のアニメーション
    if (gameState.gameRunning) {
        drawPlayerEngine(x, y);
    }
}

// プレイヤーのグロー効果
function drawPlayerGlow(x, y) {
    ctx.shadowColor = '#00ffaa';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ffaa10'; // 透明度を追加
    ctx.fillRect(x - 3, y - 3, player.width + 6, player.height + 6);
    ctx.shadowBlur = 0;
}

// プレイヤーの宇宙船詳細描画
function drawPlayerShip(x, y) {
    // 船体のメインボディ（青緑色）
    ctx.fillStyle = '#00ffaa';
    ctx.fillRect(x + 20, y + 8, 10, 20);
    
    // 船首（先端部分）
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(x + 22, y + 5, 6, 3);
    ctx.fillRect(x + 24, y + 2, 2, 3);
    
    // 左右の翼
    ctx.fillStyle = '#00cc77';
    ctx.fillRect(x + 10, y + 15, 8, 8);
    ctx.fillRect(x + 32, y + 15, 8, 8);
    
    // 翼のディテール
    ctx.fillStyle = '#00ff99';
    ctx.fillRect(x + 12, y + 17, 4, 4);
    ctx.fillRect(x + 34, y + 17, 4, 4);
    
    // コックピット
    ctx.fillStyle = '#88ffff';
    ctx.fillRect(x + 22, y + 12, 6, 4);
    
    // 船体のライト
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 19, y + 10, 1, 1);
    ctx.fillRect(x + 30, y + 10, 1, 1);
    
    // 船体のライン
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 21, y + 18, 8, 1);
    
    // 武器システム
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 18, y + 25, 2, 3);
    ctx.fillRect(x + 30, y + 25, 2, 3);
}

// プレイヤーエンジン炎描画
function drawPlayerEngine(x, y) {
    const time = Date.now() * 0.01;
    const flameHeight = 3 + Math.sin(time) * 2;
    
    // メインエンジン炎
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(x + 23, y + 28, 4, flameHeight);
    
    // サイドエンジン炎
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(x + 15, y + 26, 2, flameHeight * 0.7);
    ctx.fillRect(x + 33, y + 26, 2, flameHeight * 0.7);
    
    // 炎の先端（より明るい色）
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 24, y + 28 + flameHeight - 1, 2, 1);
}

// 弾丸描画
function drawBullets() {
    // プレイヤーの弾丸
    for (let bullet of bullets) {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // 光る効果
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 5;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    }
    
    // 敵の弾丸
    for (let bullet of enemyBullets) {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
}

// エイリアン描画
function drawAliens() {
    alienAnimationFrame += 0.1;
    
    for (let alien of aliens) {
        if (!alien.alive) continue;
        
        drawAlienByType(alien, alienAnimationFrame);
        
        // グロー効果
        drawAlienGlow(alien);
    }
}

// タイプ別エイリアン描画
function drawAlienByType(alien, animFrame) {
    const x = alien.x;
    const y = alien.y;
    const frame = Math.floor(animFrame) % 2; // アニメーションフレーム
    
    switch (alien.type) {
        case 0: // 最上段 - 司令官型
            drawCommanderAlien(x, y, frame);
            break;
        case 1: // 2段目 - 戦闘機型
            drawFighterAlien(x, y, frame);
            break;
        case 2: // 3段目 - スカウト型
            drawScoutAlien(x, y, frame);
            break;
        case 3: // 4段目 - ドローン型
            drawDroneAlien(x, y, frame);
            break;
        case 4: // 最下段 - 基本型
            drawBasicAlien(x, y, frame);
            break;
    }
}

// 司令官型エイリアン（最上段・最高得点）
function drawCommanderAlien(x, y, frame) {
    // メインボディ（紫色）
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x + 8, y + 6, 14, 8);
    
    // 頭部
    ctx.fillStyle = '#ff44ff';
    ctx.fillRect(x + 10, y + 2, 10, 6);
    
    // 目（光る）
    ctx.fillStyle = frame ? '#ffff00' : '#ff0000';
    ctx.fillRect(x + 12, y + 4, 2, 2);
    ctx.fillRect(x + 16, y + 4, 2, 2);
    
    // 触角
    ctx.fillStyle = '#ff88ff';
    ctx.fillRect(x + 9, y, 2, 3);
    ctx.fillRect(x + 19, y, 2, 3);
    
    // 装甲プレート
    ctx.fillStyle = '#aa00aa';
    ctx.fillRect(x + 6, y + 8, 18, 4);
    
    // 武器システム
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 4, y + 10, 3, 6);
    ctx.fillRect(x + 23, y + 10, 3, 6);
}

// 戦闘機型エイリアン（2段目）
function drawFighterAlien(x, y, frame) {
    // メインボディ（シアン）
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(x + 9, y + 5, 12, 10);
    
    // 翼
    ctx.fillStyle = '#00cccc';
    ctx.fillRect(x + 5, y + 8, 6, 4);
    ctx.fillRect(x + 19, y + 8, 6, 4);
    
    // コックピット
    ctx.fillStyle = frame ? '#88ffff' : '#44ffff';
    ctx.fillRect(x + 11, y + 7, 8, 6);
    
    // エンジン
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(x + 7, y + 16, 2, 2);
    ctx.fillRect(x + 21, y + 16, 2, 2);
    
    // レーザー砲
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 13, y + 15, 4, 2);
}

// スカウト型エイリアン（3段目）
function drawScoutAlien(x, y, frame) {
    // メインボディ（黄色）
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(x + 10, y + 4, 10, 12);
    
    // スキャナー（点滅）
    ctx.fillStyle = frame ? '#ff0000' : '#00ff00';
    ctx.fillRect(x + 14, y + 2, 2, 4);
    
    // サイドパネル
    ctx.fillStyle = '#cccc00';
    ctx.fillRect(x + 8, y + 7, 4, 6);
    ctx.fillRect(x + 18, y + 7, 4, 6);
    
    // センサーアレイ
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 12, y + 9, 1, 1);
    ctx.fillRect(x + 17, y + 9, 1, 1);
    ctx.fillRect(x + 15, y + 11, 1, 1);
}

// ドローン型エイリアン（4段目）
function drawDroneAlien(x, y, frame) {
    // メインボディ（オレンジ）
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(x + 11, y + 6, 8, 8);
    
    // プロペラ部分（回転アニメーション）
    ctx.fillStyle = frame ? '#ffaa44' : '#ff6600';
    ctx.fillRect(x + 8, y + 8, 4, 4);
    ctx.fillRect(x + 18, y + 8, 4, 4);
    
    // 中央コア
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 9, 2, 2);
    
    // エネルギーコア（点滅）
    ctx.fillStyle = frame ? '#00ff00' : '#0088ff';
    ctx.fillRect(x + 13, y + 4, 4, 2);
}

// 基本型エイリアン（最下段）
function drawBasicAlien(x, y, frame) {
    // メインボディ（赤）
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 9, y + 7, 12, 6);
    
    // 頭部
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x + 11, y + 4, 8, 5);
    
    // 目（まばたきアニメーション）
    ctx.fillStyle = frame ? '#000000' : '#ffff00';
    ctx.fillRect(x + 13, y + 6, 2, 2);
    ctx.fillRect(x + 17, y + 6, 2, 2);
    
    // 口
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 11, 4, 1);
    
    // 脚
    ctx.fillStyle = '#aa0000';
    ctx.fillRect(x + 10, y + 13, 2, 4);
    ctx.fillRect(x + 18, y + 13, 2, 4);
}

// エイリアンのグロー効果
function drawAlienGlow(alien) {
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#ff0000'];
    const glowColor = colors[alien.type];
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 3;
    ctx.fillStyle = glowColor + '20'; // 透明度を追加
    ctx.fillRect(alien.x - 2, alien.y - 2, alien.width + 4, alien.height + 4);
    ctx.shadowBlur = 0;
}

// 防壁描画
function drawBarriers() {
    for (let barrier of barriers) {
        for (let y = 0; y < barrier.blocks.length; y++) {
            for (let x = 0; x < barrier.blocks[y].length; x++) {
                if (barrier.blocks[y][x]) {
                    const blockX = barrier.x + x * barrierConfig.blockSize;
                    const blockY = barrier.y + y * barrierConfig.blockSize;
                    
                    // グラデーション効果で防壁を描画
                    const gradient = ctx.createLinearGradient(blockX, blockY, blockX, blockY + barrierConfig.blockSize);
                    gradient.addColorStop(0, '#00ff88');
                    gradient.addColorStop(1, '#00aa55');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(blockX, blockY, barrierConfig.blockSize, barrierConfig.blockSize);
                    
                    // ボーダー効果
                    ctx.strokeStyle = '#00cc66';
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(blockX, blockY, barrierConfig.blockSize, barrierConfig.blockSize);
                }
            }
        }
    }
}

// パーティクル描画
function drawParticles() {
    for (let particle of particles) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
        ctx.fillRect(particle.x, particle.y, 2, 2);
    }
}

// レベルアップチェック（無効化）
function checkLevelUp() {
    // プレイヤーレベルアップシステムを無効化
    // ゲームレベルのみを使用
    console.log(`Player level up system disabled. Game Level: ${gameState.level}`);
}

// レベルクリア処理
function levelComplete() {
    // 重複実行チェック
    if (gameState.levelCompleting !== true) {
        console.log('Level complete called but not in completing state, ignoring');
        return;
    }
    
    console.log(`=== LEVEL COMPLETE START ===`);
    console.log(`Current level before increment: ${gameState.level}`);
    
    // 現在のレベルを検証
    if (typeof gameState.level !== 'number' || gameState.level < 1) {
        console.error(`Invalid level detected: ${gameState.level}, forcing reset to 1`);
        gameState.level = 1;
        gameState.levelCompleting = false;
        return;
    }
    
    // 現在のレベルを保存
    const currentLevel = gameState.level;
    
    // レベル100クリアでゲームクリア
    if (currentLevel >= 100) {
        console.log('Game completed - Level 100 cleared!');
        gameComplete();
        return;
    }
    
    // レベルを確実に1つだけ増加
    gameState.level = currentLevel + 1;
    console.log(`Level incremented: ${currentLevel} → ${gameState.level}`);
    
    // レベルクリアボーナス
    const timeBonus = Math.max(0, 30000 - (Date.now() - gameState.levelStartTime)) / 100;
    const clearBonus = gameState.level * 100;
    gameState.score += Math.floor(timeBonus + clearBonus);
    
    console.log(`Score bonus added: ${Math.floor(timeBonus + clearBonus)}, New score: ${gameState.score}`);
    
    console.log(`Score updated: ${gameState.score}`);
    
    // 次のレベルの準備
    setTimeout(() => {
        console.log(`=== PREPARING NEXT LEVEL ===`);
        console.log(`Setting up level: ${gameState.level}`);
        
        // レベル完了フラグをリセット
        gameState.levelCompleting = false;
        gameState.aliensKilled = 0;
        gameState.levelStartTime = Date.now();
        
        // 新しいレベルの設定
        console.log(`Calling setLevelDifficulty with level: ${gameState.level}`);
        setLevelDifficulty(gameState.level);
        
        console.log(`After setLevelDifficulty - rows: ${alienConfig.rows}, cols: ${alienConfig.cols}, speed: ${alienConfig.speed}`);
        
        createAliens();
        
        // 防壁を部分的に復活（高レベルでは復活率低下）
        if (gameState.level <= 20 || Math.random() < 0.7) {
            createBarriers();
        }
        
        updateUI();
        showLevelStartMessage();
        
        console.log(`=== LEVEL SETUP COMPLETE ===`);
    }, 2000);
}

// ゲームクリア
function gameComplete() {
    gameState.gameRunning = false;
    showGameCompleteScreen();
}

// レベルアップエフェクト
function createLevelUpEffect() {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 60,
            maxLife: 60,
            color: '#FFD700'
        });
    }
}

// レベル開始メッセージ
function showLevelStartMessage() {
    // レベル開始の視覚的フィードバック
    createLevelStartEffect();
}

// レベル開始エフェクト
function createLevelStartEffect() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 45,
            maxLife: 45,
            color: '#00FF00'
        });
    }
}

// ゲームクリア画面
function showGameCompleteScreen() {
    // ゲームクリア用のUI表示
    const gameCompleteDiv = document.createElement('div');
    gameCompleteDiv.style.position = 'fixed';
    gameCompleteDiv.style.top = '50%';
    gameCompleteDiv.style.left = '50%';
    gameCompleteDiv.style.transform = 'translate(-50%, -50%)';
    gameCompleteDiv.style.background = 'rgba(0, 0, 0, 0.9)';
    gameCompleteDiv.style.color = '#FFD700';
    gameCompleteDiv.style.padding = '40px';
    gameCompleteDiv.style.borderRadius = '15px';
    gameCompleteDiv.style.textAlign = 'center';
    gameCompleteDiv.style.border = '3px solid #FFD700';
    gameCompleteDiv.innerHTML = `
        <h1 style="font-size: 36px; margin-bottom: 20px;">🎉 GAME COMPLETE! 🎉</h1>
        <p style="font-size: 24px; margin-bottom: 15px;">全100レベルクリア！</p>
        <p style="font-size: 20px; margin-bottom: 15px;">Final Score: ${gameState.score}</p>
        <p style="font-size: 16px; margin-bottom: 25px;">あなたは真の宇宙の勇者です！</p>
        <button onclick="restartGame(); this.parentElement.remove();" 
                style="background: #FFD700; color: #000; border: none; padding: 15px 30px; 
                       font-size: 18px; border-radius: 8px; cursor: pointer;">
            NEW GAME+
        </button>
    `;
    document.body.appendChild(gameCompleteDiv);
}

// UI更新
function updateUI() {
    scoreElement.textContent = gameState.score;
    livesElement.textContent = gameState.lives;
    
    // レベル情報を表示
    const levelInfo = document.getElementById('levelInfo');
    if (!levelInfo) {
        const levelDiv = document.createElement('div');
        levelDiv.id = 'levelInfo';
        levelDiv.className = 'level-info';
        levelDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ff00;
            font-size: 18px;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
            z-index: 100;
        `;
        document.querySelector('.game-container').appendChild(levelDiv);
    }
    
    // レベル値の安全チェック
    let displayLevel = gameState.level;
    if (typeof displayLevel !== 'number' || displayLevel < 1 || displayLevel > 100) {
        console.error(`Invalid level in UI: ${displayLevel}, using 1`);
        displayLevel = 1;
        gameState.level = 1; // 修正
    }
    
    const progress = Math.min((gameState.aliensKilled / gameState.totalAliensInLevel) * 100, 100);
    console.log(`UI Update - Displaying Level: ${displayLevel}`);
    
    document.getElementById('levelInfo').innerHTML = `
        Level ${displayLevel}/100 | Progress: ${progress.toFixed(0)}% | Score: ${gameState.score}
    `;
}

// ゲームオーバー
function gameOver() {
    gameState.gameRunning = false;
    finalScoreElement.textContent = gameState.score;
    gameOverScreen.style.display = 'block';
}

// ゲーム再開
function restartGame() {
    console.log('=== GAME RESTART ===');
    // レベルを確実に1にリセット
    gameState.level = 1;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.levelCompleting = false; // フラグもリセット
    console.log(`Game state reset - Level: ${gameState.level}`);
    initGame();
}

// メインゲームループ
function gameLoop(currentTime) {
    const deltaTime = currentTime - gameState.lastTime;
    gameState.lastTime = currentTime;
    
    if (gameState.gameRunning) {
        updatePlayer();
        updateBullets();
        updateAliens(currentTime);
        updateParticles();
        checkCollisions();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
initGame();
requestAnimationFrame(gameLoop);
