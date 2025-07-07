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
    for (let i = 0; i < PIPES_TO_RENDER; i++) {
      // Create upper pipe as a container with orange rectangle
      const upperPipeContainer = this.scene.add.container(0, 0);
      // Add orange rectangle to container
      const upperOrangeRect = this.scene.add.rectangle(0, 0, 52, 320, 0xff8c00);
      upperOrangeRect.setOrigin(0, 1);
      upperPipeContainer.add(upperOrangeRect);
      // Add blue rectangle as child of the container
      const blueRect = this.scene.add.rectangle(0, 0, 52, 16, 0x0000ff, 0);
      blueRect.setOrigin(0, 0);
      upperPipeContainer.add(blueRect);
      // Create separate hitbox for blue rectangle
      const blueHitbox = this.scene.add.rectangle(0, 0, 52, 16, 0x00ffff, 0.5);
      blueHitbox.setOrigin(0, 0);
      this.scene.physics.add.existing(blueHitbox);
      (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      this.blueHitboxes.add(blueHitbox);
      // Create grid of colored hitboxes for this pipe (5 across, 24 up)
      const colors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8000, 0x8000ff, 0xff0080, 0x80ff00, 0x0080ff, 0xff8000,
      ];
      const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
      for (let row = 0; row < 24; row++) {
        for (let col = 0; col < 5; col++) {
          const colorIndex = (row * 5 + col) % colors.length;
          const hitbox = this.scene.add.rectangle(0, 0, 12, 12, colors[colorIndex], 0.5);
          hitbox.setOrigin(0, 0);
          this.scene.physics.add.existing(hitbox);
          (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
          (hitbox.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
          this.purpleHitboxes.add(hitbox);
          pipeHitboxes.push(hitbox);
        }
      }
      (upperPipeContainer as any).purpleHitboxes = pipeHitboxes;
      this.scene.physics.add.existing(upperPipeContainer);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(52, 320);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -320);
      this.pipes.add(upperPipeContainer as any);
      // Create lower pipe as a container with orange rectangle
      const lowerPipeContainer = this.scene.add.container(0, 0);
      const orangeRect = this.scene.add.rectangle(0, 0, 52, 320, 0xff8c00);
      orangeRect.setOrigin(0, 0);
      lowerPipeContainer.add(orangeRect);
      const redRect = this.scene.add.rectangle(0, 0, 52, 16, 0xff0000, 0);
      redRect.setOrigin(0, 0);
      lowerPipeContainer.add(redRect);
      this.scene.physics.add.existing(lowerPipeContainer);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(52, 320);
      (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
      // Create separate hitbox for red rectangle
      const redHitbox = this.scene.add.rectangle(0, 0, 52, 16, 0x00ff00, 0.5);
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
    const difficulty = this.difficulties[this.currentDifficulty];
    const rightMostX = this.getRightMostPipe();
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
      if (upPipe && (upPipe as any).blueRect) {
        const blueRect = (upPipe as any).blueRect;
        blueRect.setAlpha(0);
        this.scene.tweens.killTweensOf(blueRect);
      }
    }
    if (upPipe && (upPipe as any).purpleHitboxes) {
      const pipeHitboxes = (upPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
      const pipeX = upPipe.x;
      const pipeY = upPipe.y;
      pipeHitboxes.forEach((hitbox, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        this.scene.tweens.killTweensOf(hitbox);
        const exactX = Math.round(pipeX + (col * 12)) - 2;
        const exactY = Math.round(pipeY - 288 + (row * 12));
        hitbox.setPosition(exactX, exactY);
        hitbox.setAlpha(1);
        if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
          hitbox.body.setGravityY(0);
          hitbox.body.setVelocityY(0);
          hitbox.body.setVelocityX(-200);
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
    if (this.purpleHitboxes) {
      this.purpleHitboxes.setVelocityX(-200);
    }
  }

  setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
  }

  getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach(function (pipe: any) {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      rightMostX = Math.max(sprite.x, rightMostX);
    });
    return rightMostX;
  }

  recyclePipes(scoreCallback: () => void, saveBestScoreCallback: () => void, increaseDifficultyCallback: () => void) {
    const tempPipes: Phaser.Physics.Arcade.Sprite[] = [];
    this.pipes.getChildren().forEach((pipe: any) => {
      const sprite = pipe as Phaser.Physics.Arcade.Sprite;
      if (sprite.getBounds().right <= -1) {
        tempPipes.push(sprite);
        if (tempPipes.length === 2) {
          this.placePipe(tempPipes[0], tempPipes[1]);
          scoreCallback();
          saveBestScoreCallback();
          increaseDifficultyCallback();
        }
      }
    });
  }

  // Add this method to handle purple hitbox collision
  handlePurpleHitboxCollision(kilboy: Phaser.GameObjects.GameObject, purpleHitbox: Phaser.GameObjects.GameObject): void {
    // Check if player is jumping upward (negative Y velocity)
    const player = (this.scene as any).player;
    if (player && player.sprite && player.sprite.body && player.sprite.body.velocity.y < 0) {
      // Apply gravity to the individual purple hitbox
      const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.setGravityY(400); // Same gravity as player
      }
      // Fade out the hitbox over 300ms
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: 300,
        ease: 'Linear',
      });
      // Find and trigger fall for hitboxes below this one
      this.triggerFallForHitboxesBelow(hitbox);
    }
  }

  // Add this method to trigger fall for hitboxes below
  triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle): void {
    // Add 50ms delay before triggering fall for hitboxes below
    this.scene.time.delayedCall(50, () => {
      // Find which pipe this hitbox belongs to
      if (this.pipes) {
        this.pipes.getChildren().forEach((pipe) => {
          const upperPipe = pipe as Phaser.Physics.Arcade.Sprite;
          if (upperPipe && (upperPipe as any).purpleHitboxes) {
            const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
            // Find the index of the hit hitbox
            const hitIndex = pipeHitboxes.indexOf(hitHitbox);
            if (hitIndex !== -1) {
              const hitRow = Math.floor(hitIndex / 5);
              const hitCol = hitIndex % 5;
              // Trigger fall for hitboxes in the same column but below
              pipeHitboxes.forEach((hitbox, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                // If it's the same column but below the hit hitbox
                if (col === hitCol && row > hitRow) {
                  if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                    hitbox.body.setGravityY(400); // Apply gravity
                  }
                  // Fade out over 500ms
                  this.scene.tweens.add({
                    targets: hitbox,
                    alpha: 0,
                    duration: 500,
                    ease: 'Linear',
                  });
                }
              });
              // Trigger fall for the blue hitbox associated with this pipe only if the last column (col 0) is hit
              if (hitCol === 0 && upperPipe && (upperPipe as any).blueHitbox) {
                const blueHitbox = (upperPipe as any).blueHitbox;
                if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                  blueHitbox.body.setGravityY(400);
                  // Fade out the blue hitbox over 500ms
                  this.scene.tweens.add({
                    targets: blueHitbox,
                    alpha: 0,
                    duration: 500,
                    ease: 'Linear',
                  });
                  // Rotate the blue hitbox as it falls (only if game is not over)
                  if (!(this.scene as any).isGameOver) {
                    this.scene.tweens.add({
                      targets: blueHitbox,
                      angle: -45,
                      duration: 500,
                      ease: 'Linear',
                    });
                  }
                }
                // Also fade the visual blue rectangle
                if (upperPipe && (upperPipe as any).blueRect) {
                  const blueRect = (upperPipe as any).blueRect;
                  this.scene.tweens.add({
                    targets: blueRect,
                    alpha: 0,
                    duration: 500,
                    ease: 'Linear',
                  });
                  // Rotate the visual blue rectangle as it falls (only if game is not over)
                  if (!(this.scene as any).isGameOver) {
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
      }
    });
  }
} 