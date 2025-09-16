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
    gameRunning: true,
    keys: {},
    lastTime: 0
};

// プレイヤー
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 30,
    speed: 5,
    color: '#00ff00'
};

// 弾丸配列
let bullets = [];
let enemyBullets = [];

// エイリアン配列
let aliens = [];

// エイリアンの設定
const alienConfig = {
    rows: 5,
    cols: 10,
    width: 30,
    height: 20,
    spacing: 40,
    speed: 1,
    direction: 1,
    dropDistance: 20
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
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameRunning = true;
    bullets = [];
    enemyBullets = [];
    aliens = [];
    particles = [];
    barriers = [];
    
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 60;
    
    createAliens();
    createBarriers();
    updateUI();
    gameOverScreen.style.display = 'none';
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
        if (alien.alive && Math.random() < 0.0005 && currentTime - alien.lastShot > 1000) {
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
                
                // スコア加算（上の行ほど高得点）
                gameState.score += (4 - alien.type) * 10 + 10;
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
    if (aliens.every(alien => !alien.alive)) {
        // 新しいウェーブを開始
        setTimeout(() => {
            createAliens();
            createBarriers(); // 防壁も復活
            alienConfig.speed += 0.5; // 難易度を上げる
        }, 1000);
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
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // 宇宙船のディテール
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 20, player.y + 5, 10, 5);
    ctx.fillRect(player.x + 15, player.y + 15, 5, 10);
    ctx.fillRect(player.x + 30, player.y + 15, 5, 10);
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
    for (let alien of aliens) {
        if (!alien.alive) continue;
        
        // タイプ別の色
        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#ff0000'];
        ctx.fillStyle = colors[alien.type] || '#ffffff';
        
        // エイリアンの本体
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
        
        // エイリアンのディテール（簡単な顔）
        ctx.fillStyle = '#000000';
        ctx.fillRect(alien.x + 5, alien.y + 5, 3, 3);
        ctx.fillRect(alien.x + 22, alien.y + 5, 3, 3);
        ctx.fillRect(alien.x + 12, alien.y + 12, 6, 2);
    }
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

// UI更新
function updateUI() {
    scoreElement.textContent = gameState.score;
    livesElement.textContent = gameState.lives;
}

// ゲームオーバー
function gameOver() {
    gameState.gameRunning = false;
    finalScoreElement.textContent = gameState.score;
    gameOverScreen.style.display = 'block';
}

// ゲーム再開
function restartGame() {
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
