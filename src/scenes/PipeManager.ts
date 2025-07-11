import Phaser from "phaser";

export default class PipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  public purpleHitboxes: Phaser.Physics.Arcade.Group;

  // Add these constants for column logic
  private static readonly numColumns = 5;
  private static readonly hitboxWidth = 12;
  
  // Configurable fade duration for purple cubes (in milliseconds)
  public static readonly PURPLE_CUBE_FADE_DURATION = 1000;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.purpleHitboxes = this.scene.physics.add.group();
  }

  createPipes(PIPES_TO_RENDER: number) {
    const numColumns = PipeManager.numColumns;
    const hitboxWidth = PipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    for (let i = 0; i < PIPES_TO_RENDER; i++) {
      // Create upper pipe as a container with orange rectangle
      const upperPipeContainer = this.scene.add.container(0, 0);
      // Add orange rectangle to container
      const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00, 0); // alpha 0
      upperOrangeRect.setOrigin(0, 1);
      upperPipeContainer.add(upperOrangeRect);
      // Add blue rectangle as child of the container
      const blueRect = this.scene.add.rectangle(0, 0, blueWidth, 16, 0x0000ff, 0);
      blueRect.setOrigin(0, 0);
      upperPipeContainer.add(blueRect);
      // Create separate hitbox for blue rectangle
      const blueHitbox = this.scene.add.rectangle(0, 0, blueWidth, 16, 0x00ffff, 0.5);
      blueHitbox.setOrigin(0, 0);
      this.scene.physics.add.existing(blueHitbox);
      (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.blueHitboxes.add(blueHitbox);
      // Create grid of colored hitboxes for this pipe (numColumns across, 24 up)
      // All cubes orange
      const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
      for (let row = 0; row < 24; row++) {
        for (let col = 0; col < numColumns; col++) {
          const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // orange, fully opaque
          hitbox.setOrigin(0, 0);
          
          // Set container-relative position
          const exactX = (col * hitboxWidth) - 2;
          const exactY = -288 + (row * hitboxWidth);
          hitbox.setPosition(exactX, exactY);
          
          this.scene.physics.add.existing(hitbox);
          (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
          (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
          hitbox.canDamage = true;
          upperPipeContainer.add(hitbox); // Add to container instead of group
          this.purpleHitboxes.add(hitbox);
          pipeHitboxes.push(hitbox);
        }
      }
      (upperPipeContainer as any).purpleHitboxes = pipeHitboxes;
      this.scene.physics.add.existing(upperPipeContainer);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, 320);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -320);
      this.pipes.add(upperPipeContainer as any);
      // Create lower pipe as a container with orange rectangle
      const lowerPipeContainer = this.scene.add.container(0, 0);
      const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00);
      orangeRect.setOrigin(0, 0);
      lowerPipeContainer.add(orangeRect);
      const redRect = this.scene.add.rectangle(0, 0, blueWidth, 16, 0xff0000, 0);
      redRect.setOrigin(0, 0);
      lowerPipeContainer.add(redRect);
      this.scene.physics.add.existing(lowerPipeContainer);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, 320);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
      // Create separate hitbox for red rectangle
      const redHitbox = this.scene.add.rectangle(0, 0, blueWidth, 16, 0x00ff00, 0.5);
      redHitbox.setOrigin(0, 0);
      this.scene.physics.add.existing(redHitbox);
      (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.pipes.add(lowerPipeContainer as any);
      this.greenHitboxes.add(redHitbox);
      (lowerPipeContainer as any).redHitbox = redHitbox;
      (upperPipeContainer as any).blueHitbox = blueHitbox;
      (upperPipeContainer as any).blueRect = blueRect;
      (upperPipeContainer as any).purpleHitbox = this.purpleHitboxes;
      this.placePipe(upperPipeContainer, lowerPipeContainer);
    }
    this.pipes.setVelocityX(-200);
    // Register all pipes and hitboxes with hitStop if available
    if ((this.scene as any).hitStop) {
      this.pipes.getChildren().forEach(pipe => (this.scene as any).hitStop.register(pipe));
      this.greenHitboxes.getChildren().forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
      this.blueHitboxes.getChildren().forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
      this.purpleHitboxes.getChildren().forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
    }
  }

  createRedRectangles() {
    this.pipes?.getChildren().forEach((pipe: Phaser.GameObjects.GameObject) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      const redRect = this.scene.add.rectangle(
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height / 20,
        0xff0000
      );
      redRect.setOrigin(0, 0);
    });
  }

  placePipe(upPipe: any, lowPipe: any) {
    const numColumns = PipeManager.numColumns;
    const hitboxWidth = PipeManager.hitboxWidth;
    const rightMostX = this.getRightMostPipe();
    const difficulty = this.difficulties[this.currentDifficulty];
    const pipeVerticalDistance = Phaser.Math.Between(
      difficulty.pipeVerticalDistanceRange[0],
      difficulty.pipeVerticalDistanceRange[1]
    );
    const pipeVerticalPosition = Phaser.Math.Between(
      20,
      this.config.height - 20 - pipeVerticalDistance
    );
    const pipeHorizontalDistance = Phaser.Math.Between(
      difficulty.pipeHorizontalDistanceRange[0],
      difficulty.pipeHorizontalDistanceRange[1]
    );
    
    upPipe.x = Math.round(rightMostX + pipeHorizontalDistance);
    upPipe.y = Math.round(pipeVerticalPosition);
    lowPipe.x = Math.round(upPipe.x);
    lowPipe.y = Math.round(upPipe.y + pipeVerticalDistance);
    if (lowPipe && (lowPipe as any).redHitbox) {
      const redHitbox = (lowPipe as any).redHitbox;
      redHitbox.x = lowPipe.x;
      redHitbox.y = lowPipe.y;
    }
    if (upPipe && (upPipe as any).blueHitbox) {
      const blueHitbox = (upPipe as any).blueHitbox;
      blueHitbox.x = upPipe.x - 2;
      blueHitbox.y = upPipe.y;
      if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        blueHitbox.body.setGravityY(0);
        blueHitbox.body.setVelocityY(0);
        blueHitbox.setAlpha(1);
        this.scene.tweens.killTweensOf(blueHitbox);
        blueHitbox.body.reset(upPipe.x - 2, upPipe.y);
      }
      blueHitbox.angle = 0; // Reset rotation on recycle
      if (upPipe && (upPipe as any).blueRect) {
        const blueRect = (upPipe as any).blueRect;
        blueRect.setAlpha(0);
        this.scene.tweens.killTweensOf(blueRect);
        blueRect.angle = 0; // Reset rotation on recycle
      }
    }
    if (upPipe && (upPipe as any).purpleHitboxes) {
      const pipeHitboxes = (upPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
      const pipeX = 0; // Container-relative position
      const pipeY = 0; // Container-relative position
      pipeHitboxes.forEach((hitbox, index) => {
        const row = Math.floor(index / numColumns);
        const col = index % numColumns;
        this.scene.tweens.killTweensOf(hitbox);
        const exactX = Math.round(pipeX + (col * hitboxWidth)) - 2;
        const exactY = Math.round(pipeY - 288 + (row * hitboxWidth));
        hitbox.setPosition(exactX, exactY);
        hitbox.setAlpha(1);
        // Always reset canDamage to true when recycling
        (hitbox as any).canDamage = true;
        if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
          hitbox.body.setGravityY(0);
          hitbox.body.setVelocityY(0);
          hitbox.body.reset(exactX, exactY);
        }
      });
      if (this.blueHitboxes) {
        this.blueHitboxes.getChildren().forEach((hitbox) => {
          const blueHitbox = hitbox as Phaser.Physics.Arcade.Sprite;
          if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
            blueHitbox.body.setGravityY(0);
            blueHitbox.body.setVelocityY(0);
          }
        });
      }
    }
    if (this.greenHitboxes) {
      this.greenHitboxes.setVelocityX(-200);
    }
    if (this.blueHitboxes) {
      this.blueHitboxes.setVelocityX(-200);
    }
    // Removed: Purple hitboxes now move with container
    // if (this.purpleHitboxes) {
    //   this.purpleHitboxes.setVelocityX(-200);
    // }
  }

  setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
  }

  getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach(function (pipe: any) {
      const container = pipe as Phaser.GameObjects.Container;
      rightMostX = Math.max(container.x, rightMostX);
    });
    return rightMostX;
  }

  recyclePipes(scoreCallback: () => void, saveBestScoreCallback: () => void, increaseDifficultyCallback: () => void, kilboyX?: number) {
    const tempPipes: any[] = [];
    const recycleThreshold = kilboyX ? kilboyX - 200 : -1; // Recycle when pipe is 200px behind Kilboy
    
    this.pipes.getChildren().forEach((pipe: any) => {
      const container = pipe as Phaser.GameObjects.Container;
      // For containers, use x + width to determine right edge
      const pipeRight = container.x + (container.body ? (container.body as Phaser.Physics.Arcade.Body).width : 60);
      if (pipeRight <= recycleThreshold) {
        tempPipes.push(container);
        if (tempPipes.length === 2) {
          this.placePipe(tempPipes[0], tempPipes[1]);
          scoreCallback();
          saveBestScoreCallback();
          increaseDifficultyCallback();
        }
      }
    });
  }

  // Stops all blue box (hitbox and rect) animations
  public stopAllBlueBoxAnimations(): void {
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe && pipe.blueHitbox) {
        this.scene.tweens.killTweensOf(pipe.blueHitbox);
        // Do not reset angle
      }
      if (pipe && pipe.blueRect) {
        this.scene.tweens.killTweensOf(pipe.blueRect);
        // Do not reset angle
      }
    });
  }

  /**
   * Makes all purple hitboxes below the given hitbox in the same column fall and fade out.
   * @param hitHitbox The hit purple hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over (affects blue box animation)
   */
  public triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean) {
    this.scene.time.delayedCall(50, () => {
      this.pipes.getChildren().forEach((pipe: any) => {
        const upperPipe = pipe as Phaser.GameObjects.Container;
        if (upperPipe && (upperPipe as any).purpleHitboxes) {
          const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
          const hitIndex = pipeHitboxes.indexOf(hitHitbox);
          if (hitIndex !== -1) {
            const numColumns = PipeManager.numColumns;
            const hitRow = Math.floor(hitIndex / numColumns);
            const hitCol = hitIndex % numColumns;
            pipeHitboxes.forEach((hitbox, index) => {
              const row = Math.floor(index / numColumns);
              const col = index % numColumns;
              if (col === hitCol && row > hitRow) {
                if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                  hitbox.body.setGravityY(400);
                }
                this.scene.tweens.add({
                  targets: hitbox,
                  alpha: 0,
                  duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
                  ease: 'Linear',
                });
              }
            });
            // Trigger fall for the blue hitbox associated with this pipe only if the last column (col 0) is hit
            if (hitCol === 0 && upperPipe && (upperPipe as any).blueHitbox) {
              const blueHitbox = (upperPipe as any).blueHitbox;
              if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                blueHitbox.body.setGravityY(400);
                this.scene.tweens.add({
                  targets: blueHitbox,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                });
                if (!isGameOver) {
                  this.scene.tweens.add({
                    targets: blueHitbox,
                    angle: -45,
                    duration: 500,
                    ease: 'Linear',
                  });
                }
              }
              if (upperPipe && (upperPipe as any).blueRect) {
                const blueRect = (upperPipe as any).blueRect;
                this.scene.tweens.add({
                  targets: blueRect,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                });
                if (!isGameOver) {
                  this.scene.tweens.add({
                    targets: blueRect,
                    angle: -45,
                    duration: 500,
                    ease: 'Linear',
                  });
                }
              }
            }
          }
        }
      });
    });
  }
} 