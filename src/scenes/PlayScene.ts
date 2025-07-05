import BaseScene from "./BaseScene";

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
  private kilboy: Phaser.Physics.Arcade.Sprite | null = null;
  private pipes: Phaser.Physics.Arcade.Group | null = null;
  private greenHitboxes: Phaser.Physics.Arcade.Group | null = null;
  private blueHitboxes: Phaser.Physics.Arcade.Group | null = null;
  private isTouchingBlueHitbox: boolean = false;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private pipeHorizontalDistance: number = 0;
  private pipeVerticalDistanceRange: [number, number] = [150, 250];
  private pipeHorizontalDistanceRange: [number, number] = [450, 500];
  private flapVELOCITY: number = 270;
  private initialFlapVelocity: number = 800;
  private decelerationRate: number = 0.8;
  private frameCount: number = 0;
  private score: number = 0;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private jumpCount: number = 0;
  private jumpCountText: Phaser.GameObjects.Text | null = null;
  private jumpRectangles: Phaser.GameObjects.Rectangle[] = [];
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

  constructor(config: any) {
    super("PlayScene", { ...config, canGoBack: true });
  }

  create(): void {
    super.create();
    this.isGameOver = false;
    this.currentDifficulty = "easy";
    this.createKilboy();
    this.createPipes();
    this.createRedRectangles();
    this.createColiders();
    this.createScore();
    this.createPause();
    this.handleInputs();
    this.listenToEvents();
  }

  update(): void {
    this.checkGameStatus();
    this.recyclePipes();
    this.checkGreenHitboxOverlap();
    this.checkBlueHitboxOverlap();

    // Apply deceleration to upward velocity every other frame
    if (this.kilboy && this.kilboy.body.velocity.y < 0) {
      this.frameCount++;
      if (this.frameCount % 2 === 0) {
        this.kilboy.body.velocity.y *= this.decelerationRate;
      }
    } else {
      this.frameCount = 0;
    }

    if (this.kilboy && this.kilboy.body.velocity.y > 0) {
      this.kilboy.setTexture("kilboy");
      this.kilboy.body.setSize(0, 0);
      
      // Reset jump counter when player starts falling
      this.jumpCount = 0;
      this.updateJumpRectangles();
    }
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

  private createKilboy(): void {
    this.kilboy = this.physics.add
      .sprite(
        this.config.startPosition.x,
        this.config.startPosition.y,
        "kilboy"
      )
      .setOrigin(0)
      .setDepth(1);
    this.kilboy.setBodySize(this.kilboy.width, this.kilboy.height - 8);
    this.kilboy.body.gravity.y = 400;
    this.kilboy.setCollideWorldBounds(true);
  }

  private createPipes(): void {
    this.pipes = this.physics.add.group();
    this.greenHitboxes = this.physics.add.group();
    this.blueHitboxes = this.physics.add.group();
    for (let i = 0; i < PIPES_TO_RENDER; i++) {
      // Create upper pipe as a container with orange rectangle
      const upperPipeContainer = this.add.container(0, 0);
      
      // Add orange rectangle to container
      const upperOrangeRect = this.add.rectangle(0, 0, 52, 320, 0xff8c00);
      upperOrangeRect.setOrigin(0, 1);
      upperPipeContainer.add(upperOrangeRect);
      
      // Add blue rectangle as child of the container
      const blueRect = this.add.rectangle(0, 0, 52, 16, 0x0000ff, 0);
      blueRect.setOrigin(0, 0);
      upperPipeContainer.add(blueRect);
      
      // Create separate hitbox for blue rectangle
      const blueHitbox = this.add.rectangle(0, 0, 52, 16, 0x00ffff, 0.5);
      blueHitbox.setOrigin(0, 0);
      this.physics.add.existing(blueHitbox);
      (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      
      // Add to the blue hitboxes group
      this.blueHitboxes!.add(blueHitbox);
      
      // Add physics to the container
      this.physics.add.existing(upperPipeContainer);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      
      // Set the hitbox to match the orange rectangle size and position
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(52, 320);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -320);
      
      // Add to the pipes group
      this.pipes.add(upperPipeContainer as any);
      
      // Create lower pipe as a container with orange rectangle
      const lowerPipeContainer = this.add.container(0, 0);
      
      // Add orange rectangle to container
      const orangeRect = this.add.rectangle(0, 0, 52, 320, 0xff8c00);
      orangeRect.setOrigin(0, 0);
      lowerPipeContainer.add(orangeRect);
      
      // Add red rectangle as child of the container
      const redRect = this.add.rectangle(0, 0, 52, 16, 0xff0000, 0);
      redRect.setOrigin(0, 0);
      lowerPipeContainer.add(redRect);
      
      // Add physics to the container
      this.physics.add.existing(lowerPipeContainer);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      
      // Set the hitbox to match the orange rectangle size and position
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(52, 320);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
      
      // Create separate hitbox for red rectangle
      const redHitbox = this.add.rectangle(0, 0, 52, 16, 0x00ff00, 0.5);
      redHitbox.setOrigin(0, 0);
      this.physics.add.existing(redHitbox);
      (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      
      // Add to the pipes group
      this.pipes.add(lowerPipeContainer as any);
      this.greenHitboxes!.add(redHitbox);
      
      // Store reference to red hitbox for positioning
      (lowerPipeContainer as any).redHitbox = redHitbox;
      
      // Store reference to blue hitbox for positioning
      (upperPipeContainer as any).blueHitbox = blueHitbox;

      this.placePipe(upperPipeContainer, lowerPipeContainer);
    }

    this.pipes.setVelocityX(-200);
  }

  private createRedRectangles(): void {
    this.pipes?.getChildren().forEach((pipe) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      const redRect = this.add.rectangle(
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height / 20,
        0xff0000
      );
      redRect.setOrigin(0, 0);
    });
  }

  private createColiders(): void {
    if (this.kilboy && this.pipes) {
      // Collision with pipes (orange rectangles) - causes death
      this.physics.add.collider(
        this.kilboy,
        this.pipes,
        this.gameOver,
        undefined,
        this
      );
      

      

    }
  }

  private createScore(): void {
    this.score = 0;
    this.jumpCount = 0;
    const bestScore = localStorage.getItem("bestScore");
    this.scoreText = this.add.text(16, 16, `Score: ${0}`, {
      fontSize: "32px",
      fill: "#000",
    });
    this.add.text(16, 52, `Best Score: ${bestScore || 0}`, {
      fontSize: "18px",
      fill: "#000",
    });
    
    // Clear existing rectangles and create new ones
    this.jumpRectangles.forEach(rect => rect.destroy());
    this.jumpRectangles = [];
    
    // Create jump counter rectangles
    for (let i = 0; i < 3; i++) {
      const rect = this.add.rectangle(16, 120 + (i * 25), 20, 20, 0xffff00, 0.2);
      this.jumpRectangles.push(rect);
    }
  }

  private createPause(): void {
    this.isPaused = false;
    const pauseButton = this.add
      .image(this.config.width - 60, this.config.height - 10, "pause")
      .setOrigin(1)
      .setInteractive()
      .setScale(2.8);

    pauseButton.on("pointerdown", () => {
      this.isPaused = true;
      this.physics.pause();
      this.scene.pause();
      this.scene.launch("PauseScene");
    });
  }

  private handleInputs(): void {
    this.input.on("pointerdown", this.flap, this);
    this.input.keyboard.on("keydown-SPACE", this.flap, this);
  }

  private checkGameStatus(): void {
    if (
      this.kilboy &&
      (this.kilboy.y <= 0 ||
        this.kilboy.y >= this.config.height - this.kilboy.height)
    ) {
      this.gameOver();
    }
  }

  private placePipe(upPipe: Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container, lowPipe: Phaser.Physics.Arcade.Sprite | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Container): void {
    const difficulty = this.difficulties[this.currentDifficulty];
    const rightMostX = this.getRightMostPipe();
    const pipeVerticalDistance = Phaser.Math.Between(
      ...difficulty.pipeVerticalDistanceRange
    );

    const pipeVerticalPosition = Phaser.Math.Between(
      0 + 20,
      this.config.height - 20 - pipeVerticalDistance
    );
    const pipeHorizontalDistance = Phaser.Math.Between(
      ...difficulty.pipeHorizontalDistanceRange
    );

    upPipe.x = rightMostX + pipeHorizontalDistance;
    upPipe.y = pipeVerticalPosition;

    lowPipe.x = upPipe.x;
    lowPipe.y = upPipe.y + pipeVerticalDistance;
    
    // Position the red hitbox to match the red rectangle in the container
    if (lowPipe && (lowPipe as any).redHitbox) {
      const redHitbox = (lowPipe as any).redHitbox;
      redHitbox.x = lowPipe.x;
      redHitbox.y = lowPipe.y;
    }
    
    // Position the blue hitbox to match the blue rectangle in the container
    if (upPipe && (upPipe as any).blueHitbox) {
      const blueHitbox = (upPipe as any).blueHitbox;
      blueHitbox.x = upPipe.x;
      blueHitbox.y = upPipe.y;
    }
    
    // Move green hitboxes with the same velocity
    if (this.greenHitboxes) {
      this.greenHitboxes.setVelocityX(-200);
    }
    
    // Move blue hitboxes with the same velocity
    if (this.blueHitboxes) {
      this.blueHitboxes.setVelocityX(-200);
    }
  }

  private recyclePipes(): void {
    if (!this.pipes) return;
    
    const tempPipes: Phaser.Physics.Arcade.Sprite[] = [];
    this.pipes.getChildren().forEach((pipe) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      if (sprite.getBounds().right <= -1) {
        tempPipes.push(sprite);
        if (tempPipes.length === 2) {
          this.placePipe(tempPipes[0], tempPipes[1]);
          this.increaseScore();
          this.saveBestScore();
          this.increaseDifficulty();
        }
      }
    });
  }

  private increaseDifficulty(): void {
    if (this.score === 1) {
      this.currentDifficulty = "normal";
    }
    if (this.score === 3) {
      this.currentDifficulty = "hard";
    }
  }

  private getRightMostPipe(): number {
    if (!this.pipes) return 0;
    
    let rightMostX = 0;
    this.pipes.getChildren().forEach(function (pipe) {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      rightMostX = Math.max(sprite.x, rightMostX);
    });
    return rightMostX;
  }

  private saveBestScore(): void {
    const bestScoreText = localStorage.getItem("bestScore");
    const bestScore = bestScoreText && parseInt(bestScoreText, 10);
    if (!bestScore || this.score > bestScore) {
      localStorage.setItem("bestScore", this.score.toString());
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.physics.pause();
    if (this.kilboy) {
      this.kilboy.setTint(0xff0000);
    }

    this.saveBestScore();

    this.time.addEvent({
      delay: 500,
      callback: () => {
        this.scene.restart();
      },
      loop: false,
    });
  }

  private stopGravity(): void {
    if (this.kilboy) {
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setGravityY(0);
    }
  }

  private restoreGravity(): void {
    if (this.kilboy) {
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkGreenHitboxOverlap(): void {
    if (!this.kilboy || !this.greenHitboxes) return;
    
    let isOverlapping = false;
    this.greenHitboxes.getChildren().forEach((hitbox) => {
      if (this.kilboy && this.physics.overlap(this.kilboy, hitbox)) {
        isOverlapping = true;
      }
    });
    
    if (isOverlapping) {
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
    } else {
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkBlueHitboxOverlap(): void {
    if (!this.kilboy || !this.blueHitboxes) return;
    
    let isOverlapping = false;
    this.blueHitboxes.getChildren().forEach((hitbox) => {
      if (this.kilboy && this.physics.overlap(this.kilboy, hitbox)) {
        isOverlapping = true;
      }
    });
    
    if (isOverlapping && !this.isTouchingBlueHitbox) {
      // First time hitting the blue hitbox
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      (this.kilboy.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      this.isTouchingBlueHitbox = true;
    } else if (!isOverlapping && this.isTouchingBlueHitbox) {
      // No longer touching the blue hitbox
      this.isTouchingBlueHitbox = false;
    }
  }

  private flap(): void {
    if (this.isPaused || !this.kilboy || this.jumpCount >= 3) {
      return;
    }
    
    // Start with high velocity for speed feeling
    this.kilboy.body.velocity.y = -this.initialFlapVelocity;
    this.kilboy.y = this.kilboy.y;
    this.kilboy.setTexture("kilboy2");
    
    // Increment jump counter
    this.jumpCount++;
    this.updateJumpRectangles();
  }

  private updateJumpRectangles(): void {
    // Don't update rectangles if game is over
    if (this.isGameOver) {
      return;
    }
    
    this.jumpRectangles.forEach((rect, index) => {
      if (index >= (3 - this.jumpCount)) {
        rect.setAlpha(1); // 100% opacity
      } else {
        rect.setAlpha(0.2); // 20% opacity
      }
    });
  }

  private increaseScore(): void {
    this.score++;
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }
}

export default PlayScene; 