import BaseScene from "./BaseScene";
import UIManager from "./UIManager";
import Player from "./Player";
import PipeManager from "./PipeManager";
import HitStop from "../HitStop";

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
  private flapVELOCITY: number = 270;
  private initialFlapVelocity: number = 800;
  private decelerationRate: number = 0.8;
  private frameCount: number = 0;
  private score: number = 0;
  private jumpCount: number = 0;
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
  public hitStop!: HitStop;
  private debugYText!: Phaser.GameObjects.Text;

  constructor(config: any) {
    super("PlayScene", { ...config, canGoBack: true });
  }

  create(): void {
    super.create();
    this.isGameOver = false;
    this.currentDifficulty = "easy";
    this.hitStop = new HitStop(this); // Instantiate HitStop
    
    // Create background first
    this.createBG();
    
    this.player = new Player(this, this.config.startPosition);
    // Register the player physics object for hitstop
    this.hitStop.register(this.player.sprite);
    
    // Setup camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setFollowOffset(-this.config.width / 3, 0); // Position Kilboy about 1/6th from left
    this.cameras.main.setLerp(0.1, 0.1); // Smooth camera movement
    this.cameras.main.setDeadzone(75, 40); // Larger dead zone for more movement freedom
    
    this.pipeManager = new PipeManager(this, this.config, this.difficulties, this.currentDifficulty);
    this.pipeManager.createPipes(PIPES_TO_RENDER);
    this.createColiders();
    this.uiManager = new UIManager(this);
    const bestScore = localStorage.getItem("bestScore");
    this.uiManager.createScoreUI(0, bestScore ? parseInt(bestScore, 10) : 0);
    this.uiManager.createJumpRectangles();
    this.uiManager.createHealthUI(3);
    this.createPause();
    this.createDebugUI();
    this.handleInputs();
    this.listenToEvents();
  }

  update(): void {
    // Sync upper hitbox first, before any movement
    this.player.syncUpperHitbox();
    this.player.preUpdate(); // (now does nothing, but kept for structure)
    this.checkGameStatus();
    this.pipeManager.recyclePipes(
      () => this.increaseScore(),
      () => this.saveBestScore(),
      () => this.increaseDifficulty(),
      this.player.sprite.x
    );
    this.checkGreenHitboxOverlap();
    this.checkBlueHitboxOverlap();
    this.uiManager.updateHealthUI(this.player.getHealth());
    this.player.updateAttackHitboxPosition();
    
    // Update debug Y position
    if (this.debugYText && this.player && this.player.sprite) {
      this.debugYText.setText(`Y: ${Math.round(this.player.sprite.y)}`);
    }
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
      if (!this.player.isInvincible && !this.player.isHoldingSwingFrameActive) {
        this.player.sprite.setTexture("kilboy");
      } else if (this.player.isHoldingSwingFrameActive) {
        // Debug: PlayScene tried to override but swing frame is active
        console.log('[PLAYSCE] Preserving swing texture - isHoldingSwingFrameActive:', this.player.isHoldingSwingFrameActive);
      }
      if (!this.isGameOver && !this.player.isHoldingSwingFrameActive) {
        this.jumpCount = 0;
        this.updateJumpRectangles();
      } else if (this.player.isHoldingSwingFrameActive) {
        console.log('[PLAYSCE] Preventing jumpCount reset during swing frame hold');
      }
    }
    // Sync blueBottomHitbox to follow blueHitbox every frame
    this.pipeManager.blueHitboxes.getChildren().forEach((blueHitbox: any) => {
      if (blueHitbox.blueBottomHitbox) {
        blueHitbox.blueBottomHitbox.x = blueHitbox.x + blueHitbox.width / 2;
        // blueHitbox.blueBottomHitbox.y = blueHitbox.y + blueHitbox.height + 60; // Keep y fixed
        if (blueHitbox.blueBottomHitbox.body) {
          blueHitbox.blueBottomHitbox.body.velocity.x = blueHitbox.body.velocity.x;
          blueHitbox.blueBottomHitbox.body.velocity.y = blueHitbox.body.velocity.y;
        }
      }
    });
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
    const bg = this.add.image(0, 0, "sky-bg").setOrigin(0);
    bg.setScrollFactor(0); // This makes the background fixed to the camera
  }

  private createColiders(): void {
    if (this.player && this.pipeManager.pipes) {
      // Optionally add pipe collision logic here
    }
    // Upper hitbox collides with blue boxes
    if (this.player && this.player.upperHitbox && this.pipeManager.blueHitboxes) {
      this.physics.add.collider(
        this.player.upperHitbox,
        this.pipeManager.blueHitboxes,
        (obj1: any, obj2: any) => {
          // Handle blue box collision with upper hitbox
          this.handleBlueBoxCollision(obj2);
        },
        undefined,
        this
      );
    }
    // Sprite collides with purple boxes
    if (this.player && this.pipeManager.purpleHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.pipeManager.purpleHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handlePurpleHitboxCollision(obj2, this.pipeManager, this.isGameOver);
            // Prevent damage if player is in attack swing animation
            const isInAttackSwing = this.player.sprite.anims.isPlaying && this.player.sprite.anims.currentAnim?.key === "kilboy_swing_anim";
            if (shouldTakeDamage && !this.player.isInvincible && !isInAttackSwing) {
              if (this.player.takeHit()) {
                this.gameOver();
              }
              this.uiManager.updateHealthUI(this.player.getHealth());
            }
          }
        },
        undefined,
        this
      );
    }
  }

  private handleBlueBoxCollision(blueHitbox: any): void {
    // Handle blue box collision logic here
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(25);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      if (this.player) {
        this.player.canFlap = false;
        this.time.delayedCall(45, () => {
          this.player.canFlap = true;
        });
        // Destroy attack hitboxes if they exist
        if (this.player["hitStopCheck"]) {
          this.player["hitStopCheck"].destroy();
          this.player["hitStopCheck"] = undefined;
        }
        if (this.player["attackHitbox"]) {
          this.player["attackHitbox"].destroy();
          this.player["attackHitbox"] = undefined;
        }
      }
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
    
    pauseButton.setScrollFactor(0); // Fix to camera

    pauseButton.on("pointerdown", () => {
      this.isPaused = true;
      this.physics.pause();
      this.scene.pause();
      this.scene.launch("PauseScene");
    });
  }

  private createDebugUI(): void {
    // Create debug text in top-left corner
    this.debugYText = this.add
      .text(10, 10, "Y: 0", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0) // Fix to camera
      .setDepth(20); // Ensure it's on top
  }

  private handleInputs(): void {
    this.input.on("pointerdown", this.flap, this);
    this.input.keyboard?.on("keydown-SPACE", this.flap, this);
  }

  private checkGameStatus(): void {
    // Y movement limits removed - Kilboy can now move freely in Y direction
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
    this.uiManager.updateJumpRectanglesAtDeath();
    this.pipeManager.stopAllBlueBoxAnimations();
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
    let firstOverlappingGreen: any = null;
    this.pipeManager.greenHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
        isOverlapping = true;
        if (!firstOverlappingGreen) firstOverlappingGreen = hitbox;
      }
    });
    if (isOverlapping) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      // Only set texture if not holding swing frame
      if (!this.player.isHoldingSwingFrameActive) {
        this.player.sprite.setTexture("kilboy_run");
      } else {
        console.log('[PLAYSCE] Green hitbox contact - preserving swing texture during frame hold');
      }
      // Set Kilboy's y position to a constant offset above the green box
      if (firstOverlappingGreen) {
        this.player.sprite.y = firstOverlappingGreen.y - 48; // Tweak this offset as needed
      }
    } else {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkBlueHitboxOverlap(): void {
    if (!this.player || !this.player.upperHitbox || !this.pipeManager.blueHitboxes) return;
    let isOverlapping = false;
    this.pipeManager.blueHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.upperHitbox && this.physics.overlap(this.player.upperHitbox, hitbox)) {
        isOverlapping = true;
      }
    });
    if (isOverlapping && !this.isTouchingBlueHitbox) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(25);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      if (this.player) {
        this.player.canFlap = false;
        this.time.delayedCall(45, () => {
          this.player.canFlap = true;
        });
        // Destroy attack hitboxes if they exist
        if (this.player["hitStopCheck"]) {
          this.player["hitStopCheck"].destroy();
          this.player["hitStopCheck"] = undefined;
        }
        if (this.player["attackHitbox"]) {
          this.player["attackHitbox"].destroy();
          this.player["attackHitbox"] = undefined;
        }
      }
      this.isTouchingBlueHitbox = true;
    } else if (!isOverlapping && this.isTouchingBlueHitbox) {
      this.isTouchingBlueHitbox = false;
    }
  }

  private flap(): void {
    if (this.isGameOver || this.isPaused || !this.player || this.jumpCount >= 3) {
      return;
    }
    if (this.player.flap(this.initialFlapVelocity)) {
      this.jumpCount++;
      this.updateJumpRectangles();
    }
  }

  private updateJumpRectangles(): void {
    if (this.isGameOver) return;
    this.uiManager.updateJumpRectangles(this.jumpCount);
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
    if (!this.player.isInvincible) {
      if (this.player.takeHit()) {
        this.gameOver();
      }
      this.uiManager.updateHealthUI(this.player.getHealth());
    }
  }


}

export default PlayScene; 