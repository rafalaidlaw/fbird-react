import BaseScene from "./BaseScene";
import UIManager from "./UIManager";
import Player from "./Player";
import PipeManager from "./PipeManager";

const PIPES_TO_RENDER = 4;

interface Difficulty {
  pipeHorizontalDistanceRange: [number, number];
  pipeVerticalDistanceRange: [number, number];
}

interface Difficulties {
  easy: Difficulty;
  normal: Difficulty;
  hard: Difficulty;
}

class PlayScene extends BaseScene {
  private player!: Player;
  private pipeManager!: PipeManager;
  private isTouchingBlueHitbox: boolean = false;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private isInvincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;
  private flapVELOCITY: number = 270;
  private initialFlapVelocity: number = 800;
  private decelerationRate: number = 0.8;
  private frameCount: number = 0;
  private score: number = 0;
  private jumpCount: number = 0;
  private jumpCountAtDeath: number = 0;
  private lastJumpUIState: number[] = [0, 0];
  private currentDifficulty: keyof Difficulties = "easy";
  private difficulties: Difficulties = {
    easy: {
      pipeHorizontalDistanceRange: [300, 350],
      pipeVerticalDistanceRange: [150, 200],
    },
    normal: {
      pipeHorizontalDistanceRange: [280, 330],
      pipeVerticalDistanceRange: [140, 190],
    },
    hard: {
      pipeHorizontalDistanceRange: [250, 310],
      pipeVerticalDistanceRange: [120, 150],
    },
  };
  private pauseEvent?: Phaser.Events.EventEmitter;
  private initialTime?: number;
  private countDownText?: Phaser.GameObjects.Text;
  private timedEvent?: Phaser.Time.TimerEvent;
  private uiManager!: UIManager;

  constructor(config: any) {
    super("PlayScene", { ...config, canGoBack: true });
  }

  create(): void {
    super.create();
    this.isGameOver = false;
    this.isInvincible = false;
    this.currentDifficulty = "easy";
    this.player = new Player(this, this.config.startPosition);
    this.pipeManager = new PipeManager(this, this.config, this.difficulties, this.currentDifficulty);
    this.pipeManager.createPipes(PIPES_TO_RENDER);
    this.createColiders();
    this.uiManager = new UIManager(this);
    const bestScore = localStorage.getItem("bestScore");
    this.uiManager.createScoreUI(0, bestScore ? parseInt(bestScore, 10) : 0);
    this.uiManager.createJumpRectangles();
    this.createPause();
    this.handleInputs();
    this.listenToEvents();
  }

  update(): void {
    this.checkGameStatus();
    this.pipeManager.recyclePipes(
      () => this.increaseScore(),
      () => this.saveBestScore(),
      () => this.increaseDifficulty()
    );
    this.checkGreenHitboxOverlap();
    this.checkBlueHitboxOverlap();
    if (this.isGameOver) {
      this.stopAllAnimationsOnDeath();
      return;
    }
    if (this.player && this.player.sprite.body && this.player.sprite.body.velocity.y < 0) {
      this.frameCount++;
      if (this.frameCount % 2 === 0) {
        this.player.sprite.body.velocity.y *= this.decelerationRate;
      }
    } else {
      this.frameCount = 0;
    }
    if (this.player && this.player.sprite.body && this.player.sprite.body.velocity.y > 0) {
      this.player.sprite.setTexture("kilboy");
      this.player.sprite.body.setSize(0, 0);
      if (!this.isGameOver) {
        this.jumpCount = 0;
        this.updateJumpRectangles();
      }
    }
    this.preventHorizontalPushback();
    this.checkPlayerBoundary();
  }

  private listenToEvents(): void {
    if (this.pauseEvent) {
      return;
    }
    this.pauseEvent = this.events.on("resume", () => {
      this.initialTime = 3;
      this.countDownText = this.add
        .text(
          ...this.screenCenter,
          "Fly in: " + this.initialTime,
          this.fontOptions
        )
        .setOrigin(0.5);
      this.timedEvent = this.time.addEvent({
        delay: 1000,
        callback: this.countDown,
        callbackScope: this,
        loop: true,
      });
    });
  }

  private countDown(): void {
    if (this.initialTime !== undefined) {
      this.initialTime--;
      this.countDownText?.setText("Fly in: " + this.initialTime);
      if (this.initialTime !== undefined && this.initialTime <= 0) {
        this.isPaused = false;
        this.countDownText?.setText("");
        this.physics.resume();
        if (this.timedEvent) {
          this.timedEvent.remove();
        }
      }
    }
  }

  private createBG(): void {
    this.add.image(0, 0, "sky-bg").setOrigin(0);
  }

  private createColiders(): void {
    if (this.player && this.pipeManager.pipes) {
      // Optionally add pipe collision logic here
    }
    if (this.player && this.pipeManager.purpleHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.pipeManager.purpleHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            this.pipeManager.handlePurpleHitboxCollision(obj1, obj2);
          }
        },
        undefined,
        this
      );
    }
  }

  private createScore(): void {
    // No longer needed, handled by UIManager
  }

  private createPause(): void {
    this.isPaused = false;
    const pauseButton = this.add
      .image(this.config.width - 60, this.config.height - 10, "pause")
      .setOrigin(1)
      .setInteractive()
      .setScale(2.8)
      .setDepth(10); // Ensure pause button is on top of all game objects

    pauseButton.on("pointerdown", () => {
      this.isPaused = true;
      this.physics.pause();
      this.scene.pause();
      this.scene.launch("PauseScene");
    });
  }

  private handleInputs(): void {
    this.input.on("pointerdown", this.flap, this);
    this.input.keyboard?.on("keydown-SPACE", this.flap, this);
  }

  private checkGameStatus(): void {
    if (this.player && this.player.sprite) {
      if (this.player.sprite.y <= 0) {
        if (!this.isInvincible) {
          this.jumpCountAtDeath = this.lastJumpUIState[0];
          this.gameOver();
        }
      }
      if (this.player.sprite.y >= this.config.height - this.player.sprite.height) {
        this.player.sprite.y = this.config.height - this.player.sprite.height;
        if (this.player.sprite.body && this.player.sprite.body instanceof Phaser.Physics.Arcade.Body) {
          this.player.sprite.body.setVelocityY(0);
        }
      }
    }
  }

  private preventHorizontalPushback(): void {
    if (this.player && this.player.sprite) {
      const currentX = this.player.sprite.x;
      if (this.player.sprite.body && this.player.sprite.body instanceof Phaser.Physics.Arcade.Body) {
        this.player.sprite.body.setVelocityX(0);
      }
      this.player.sprite.x = currentX;
    }
  }

  private checkPlayerBoundary(): void {
    if (this.player && this.player.sprite.body && this.player.sprite.body instanceof Phaser.Physics.Arcade.Body) {
      if (this.player.sprite.x < 40) {
        this.player.sprite.body.setVelocityX(200);
      } else {
        this.player.sprite.body.setVelocityX(0);
      }
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.physics.pause();
    if (this.player && this.player.sprite) {
      this.player.sprite.setTint(0xff0000);
    }

    // Stop all animations when player dies
    this.stopAllAnimationsOnDeath();

    this.saveBestScore();

    this.time.addEvent({
      delay: 500,
      callback: () => {
        this.scene.restart();
      },
      loop: false,
    });
  }

  private stopAllAnimationsOnDeath(): void {
    this.uiManager.updateJumpRectanglesAtDeath(this.jumpCountAtDeath);
  }

  private stopGravity(): void {
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
    }
  }

  private restoreGravity(): void {
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkGreenHitboxOverlap(): void {
    if (!this.player || !this.player.sprite || !this.pipeManager.greenHitboxes) return;
    let isOverlapping = false;
    this.pipeManager.greenHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
        isOverlapping = true;
      }
    });
    if (isOverlapping) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      this.player.sprite.setTexture("kilboy_run");
    } else {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkBlueHitboxOverlap(): void {
    if (!this.player || !this.player.sprite || !this.pipeManager.blueHitboxes) return;
    let isOverlapping = false;
    this.pipeManager.blueHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
        isOverlapping = true;
      }
    });
    if (isOverlapping && !this.isTouchingBlueHitbox) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      this.isTouchingBlueHitbox = true;
    } else if (!isOverlapping && this.isTouchingBlueHitbox) {
      this.isTouchingBlueHitbox = false;
    }
  }

  private flap(): void {
    if (this.isGameOver || this.isPaused || !this.player || this.jumpCount >= 3) {
      return;
    }
    this.player.flap(this.initialFlapVelocity);
    this.jumpCount++;
    this.updateJumpRectangles();
  }

  private updateJumpRectangles(): void {
    if (this.isGameOver) return;
    this.uiManager.updateJumpRectangles(this.jumpCount);
    let litCount = 0;
    for (let i = 0; i < this.uiManager.getJumpRectangles().length; i++) {
      if (i >= (3 - this.jumpCount)) litCount++;
    }
    this.lastJumpUIState[0] = this.lastJumpUIState[1];
    this.lastJumpUIState[1] = litCount;
  }

  private setInvincible(invincible: boolean): void {
    this.isInvincible = invincible;
    this.player.setInvincible(invincible);
  }

  private enableInvincibility(): void {
    this.setInvincible(true);
  }

  private startInvincibleFlash(): void {
    // Stop any existing flash timer
    this.stopInvincibleFlash();
    
    // Start flashing effect
    this.invincibleFlashTimer = this.time.addEvent({
      delay: 40, // Flash every 200ms
      callback: this.toggleInvincibleOpacity,
      callbackScope: this,
      loop: true
    });
  }

  private stopInvincibleFlash(): void {
    if (this.invincibleFlashTimer) {
      this.invincibleFlashTimer.remove();
      this.invincibleFlashTimer = undefined;
    }
  }

  private toggleInvincibleOpacity(): void {
    if (this.player && this.isInvincible) {
      // Animate between 50% and 100% opacity
      const currentAlpha = this.player.sprite.alpha;
      const targetAlpha = currentAlpha === 0.1 ? .9 : 0.1;
      
      this.tweens.add({
        targets: this.player.sprite,
        alpha: targetAlpha,
        duration: 40, // 200ms animation
        //ease: 'Sine.easeInOut'
      });
    }
  }

  private disableInvincibility(): void {
    this.setInvincible(false);
  }

  private increaseScore(): void {
    this.score++;
    this.uiManager.updateScore(this.score);
  }

  private saveBestScore(): void {
    const bestScoreText = localStorage.getItem("bestScore");
    const bestScore = bestScoreText && parseInt(bestScoreText, 10);
    if (!bestScore || this.score > bestScore) {
      localStorage.setItem("bestScore", this.score.toString());
    }
  }

  private increaseDifficulty(): void {
    if (this.score === 1) {
      this.currentDifficulty = "normal";
      this.pipeManager.setCurrentDifficulty("normal");
    }
    if (this.score === 3) {
      this.currentDifficulty = "hard";
      this.pipeManager.setCurrentDifficulty("hard");
    }
  }

  private handleCollision(): void {
    if (!this.isInvincible) {
      this.gameOver();
    }
  }


}

export default PlayScene; 