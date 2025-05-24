// Game Constants
const GAME = {
  BRICK_ROWS: 9,
  BRICK_COLUMNS: 5,
  INITIAL_BALL_SPEED: 4,
  LEVEL_UP_SCORE: 1000,
  MAX_LEVEL: 10
};

// DOM Elements
const elements = {
  canvas: document.getElementById('game-canvas'),
  scoreDisplay: document.getElementById('score-display'),
  levelDisplay: document.getElementById('level-display'),
  rulesBtn: document.getElementById('rules-btn'),
  closeRulesBtn: document.getElementById('close-rules-btn'),
  rulesModal: document.getElementById('rules-modal'),
  gameOverModal: document.getElementById('game-over-modal'),
  finalScore: document.getElementById('final-score'),
  finalLevel: document.getElementById('final-level'),
  restartBtn: document.getElementById('restart-btn'),
  soundBtn: document.getElementById('sound-btn'),
  bounceSound: document.getElementById('bounce-sound'),
  brickSound: document.getElementById('brick-sound'),
  gameoverSound: document.getElementById('gameover-sound')
  
};

const ctx = elements.canvas.getContext('2d');
let score = 0;
let level = 1;
let isSoundOn = true;

// Game Objects
const ball = {
  x: elements.canvas.width / 2,
  y: elements.canvas.height / 2,
  size: 10,
  speed: GAME.INITIAL_BALL_SPEED,
  dx: GAME.INITIAL_BALL_SPEED,
  dy: -GAME.INITIAL_BALL_SPEED,
  color: '#ff2a6d'
};

const paddle = {
  x: elements.canvas.width / 2 - 50,
  y: elements.canvas.height - 30,
  w: 100,
  h: 12,
  speed: 10,
  dx: 0,
  color: '#05d9e8'
};

const brickInfo = {
  w: 70,
  h: 20,
  padding: 12,
  offsetX: 45,
  offsetY: 60,
  visible: true
};

// Initialize bricks with different colors per row
const brickColors = ['#05d9e8', '#d300c5', '#00ff9d', '#ff2a6d', '#ff8c00'];
const bricks = Array.from({ length: GAME.BRICK_ROWS }, (_, i) =>
  Array.from({ length: GAME.BRICK_COLUMNS }, (_, j) => ({
    x: i * (brickInfo.w + brickInfo.padding) + brickInfo.offsetX,
    y: j * (brickInfo.h + brickInfo.padding) + brickInfo.offsetY,
    ...brickInfo,
    color: brickColors[j % brickColors.length]
  }))
);

// Game State
let gameRunning = true;

// Drawing functions
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.shadowBlur = 15;
  ctx.shadowColor = ball.color;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;
}

function drawPaddle() {
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 5);
  ctx.fillStyle = paddle.color;
  ctx.shadowBlur = 15;
  ctx.shadowColor = paddle.color;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;
}

function drawBricks() {
  bricks.forEach(column => {
    column.forEach(brick => {
      if (brick.visible) {
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
        ctx.fillStyle = brick.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = brick.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
      }
    });
  });
}

function drawScore() {
  elements.scoreDisplay.textContent = String(score).padStart(5, '0');
}

function drawLevel() {
  elements.levelDisplay.textContent = String(level).padStart(2, '0');
}

function drawAll() {
  // Clear canvas with semi-transparent black for trail effect
  ctx.fillStyle = 'rgba(5, 1, 15, 0.2)';
  ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
  
  // Draw game elements
  drawBricks();
  drawPaddle();
  drawBall();
}

// Game logic
function movePaddle() {
  paddle.x += paddle.dx;
  
  // Wall detection with clamping
  paddle.x = Math.max(0, Math.min(elements.canvas.width - paddle.w, paddle.x));
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Wall collision (left/right)
  if (ball.x + ball.size > elements.canvas.width || ball.x - ball.size < 0) {
    ball.dx *= -1;
    playSound(elements.bounceSound);
  }

  // Wall collision (top)
  if (ball.y - ball.size < 0) {
    ball.dy *= -1;
    playSound(elements.bounceSound);
  }

  // Paddle collision
  if (
    ball.x + ball.size > paddle.x &&
    ball.x - ball.size < paddle.x + paddle.w &&
    ball.y + ball.size > paddle.y
  ) {
    // Calculate bounce angle based on where ball hits paddle
    const hitPosition = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const angle = hitPosition * Math.PI / 3; // Max 60 degree angle
    
    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle);
    
    playSound(elements.bounceSound);
  }

  // Brick collision
  let bricksRemaining = 0;
  
  bricks.forEach(column => {
    column.forEach(brick => {
      if (brick.visible) {
        bricksRemaining++;
        
        if (
          ball.x - ball.size < brick.x + brick.w &&
          ball.x + ball.size > brick.x &&
          ball.y - ball.size < brick.y + brick.h &&
          ball.y + ball.size > brick.y
        ) {
          ball.dy *= -1;
          brick.visible = false;
          score += level * 10;
          drawScore();
          playSound(elements.brickSound);
          
          // Check for level completion
          if (--bricksRemaining === 0) {
            levelUp();
          }
        }
      }
    });
  });

  // Bottom collision - Game Over
  if (ball.y + ball.size > elements.canvas.height) {
    gameOver();
  }
}

function levelUp() {
  level = Math.min(level + 1, GAME.MAX_LEVEL);
  drawLevel();
  
  // Increase ball speed slightly
  ball.speed += 0.5;
  ball.dx = ball.dx > 0 ? ball.speed : -ball.speed;
  ball.dy = -ball.speed;
  
  // Reset ball and paddle position
  ball.x = elements.canvas.width / 2;
  ball.y = elements.canvas.height / 2;
  paddle.x = elements.canvas.width / 2 - paddle.w / 2;
  
  // Reset bricks
  resetBricks();
}

function resetBricks() {
  bricks.forEach((column, i) => {
    column.forEach((brick, j) => {
      brick.visible = true;
      // Change colors for visual variety
      brick.color = brickColors[(j + level) % brickColors.length];
    });
  });
}

function resetGame() {
  score = 0;
  level = 1;
  drawScore();
  drawLevel();
  
  ball.speed = GAME.INITIAL_BALL_SPEED;
  ball.x = elements.canvas.width / 2;
  ball.y = elements.canvas.height / 2;
  ball.dx = GAME.INITIAL_BALL_SPEED;
  ball.dy = -GAME.INITIAL_BALL_SPEED;
  
  paddle.x = elements.canvas.width / 2 - paddle.w / 2;
  
  resetBricks();
  gameRunning = true;
}

function gameOver() {
  gameRunning = false;
  elements.finalScore.textContent = String(score).padStart(5, '0');
  elements.finalLevel.textContent = String(level).padStart(2, '0');
  elements.gameOverModal.classList.add('show');
  playSound(elements.gameoverSound);
}

function playSound(soundElement) {
  if (isSoundOn) {
    soundElement.currentTime = 0;
    soundElement.play().catch(e => console.log("Sound playback prevented:", e));
  }
}

// Game loop
function update() {
  if (gameRunning) {
    movePaddle();
    moveBall();
    drawAll();
  }
  requestAnimationFrame(update);
}

// Event handlers
function handleKeyDown(e) {
  if (e.key === 'ArrowRight') paddle.dx = paddle.speed;
  if (e.key === 'ArrowLeft') paddle.dx = -paddle.speed;
}

function handleKeyUp(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') paddle.dx = 0;
}

function toggleSound() {
  isSoundOn = !isSoundOn;
  elements.soundBtn.classList.toggle('sound-on');
  elements.soundBtn.textContent = isSoundOn ? '🔊' : '🔇';
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
elements.rulesBtn.addEventListener('click', () => elements.rulesModal.classList.add('show'));
elements.closeRulesBtn.addEventListener('click', () => elements.rulesModal.classList.remove('show'));
elements.restartBtn.addEventListener('click', () => {
  elements.gameOverModal.classList.remove('show');
  resetGame();
});
elements.soundBtn.addEventListener('click', toggleSound);

// Initialize game
drawScore();
drawLevel();
update();