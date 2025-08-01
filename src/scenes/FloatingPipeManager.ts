import Phaser from "phaser";

export default class FloatingPipeManager {
  private scene: Phaser.Scene;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  // Add a group for floating pipe purple cubes
  public floatingPurpleHitboxes: Phaser.Physics.Arcade.Group;
  public ledgeGrabHitboxes: Phaser.Physics.Arcade.Group;
  public fallingPurpleHitboxes: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string, upperPipeManager: any, lowerPipeManager: any) {
    this.scene = scene;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.floatingPurpleHitboxes = this.scene.physics.add.group();
    this.ledgeGrabHitboxes = this.scene.physics.add.group();
    this.fallingPurpleHitboxes = this.scene.physics.add.group();
  }

  // Create a floating pipe at the specified position
  createFloatingPipe(x: number, y: number): any {
    // Create main floating pipe container
    const floatingPipeContainer = this.scene.add.container(x, y);
    
    // Create tiled bush pattern instead of placeholder rectangle
    const bushSize = 16;
    const pipeWidth = 80;
    const pipeHeight = 192;
    const numCols = pipeWidth / bushSize; // 80 / 16 = 5 columns
    const numRows = pipeHeight / bushSize; // 192 / 16 = 12 rows
    
    const bushContainer = this.scene.add.container(0, 0);
    bushContainer.setName('bushContainer');
    
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const bush = this.scene.add.image(
          col * bushSize, 
          row * bushSize, 
          'bush'
        );
        bush.setOrigin(0, 0);
        bush.setDisplaySize(bushSize, bushSize);
        bushContainer.add(bush);
      }
    }
    
    floatingPipeContainer.addAt(bushContainer, 0);
    (floatingPipeContainer as any).bushContainer = bushContainer;

    // Create green walkable platform on top (serves as both visual and physics)
    const greenPlatform = this.scene.add.rectangle(
      40, 
      16, // Position at top of container
      80, 
      32, 
      0x66ff00
    );
    floatingPipeContainer.add(greenPlatform);
    this.scene.physics.add.existing(greenPlatform);
    (greenPlatform.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.greenHitboxes.add(greenPlatform);
    (floatingPipeContainer as any).greenHitbox = greenPlatform;

    // Create blue hitbox at the bottom (serves as both visual and physics)
    const blueHitbox = this.scene.add.rectangle(
      40, // Centered horizontally in the container
      176, // Position at bottom of container
      80, 
      32, 
      0x00ffff // Cyan color
    );
    floatingPipeContainer.add(blueHitbox);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.blueHitboxes.add(blueHitbox);
    (floatingPipeContainer as any).blueHitbox = blueHitbox;

    // Set up physics for the container
    this.scene.physics.add.existing(floatingPipeContainer);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(80, 192);

    this.pipes.add(floatingPipeContainer as any);

    // Initialize empty purple hitboxes array (will be populated on-demand)
    (floatingPipeContainer as any).purpleHitboxes = [];

    // Initialize ledge grab flag (false = ledge grab not used yet)
    (floatingPipeContainer as any).ledgeGrabUsed = false;

    return floatingPipeContainer;
  }

  // Generate purple cubes for the floating pipe (between green and blue platforms)
  public generatePurpleCubesForFloatingPipe(floatingPipeContainer: any): void {
    // Check if purple cubes already exist for this pipe
    if ((floatingPipeContainer as any).purpleHitboxes && (floatingPipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = 5; // Match cube columns
    const hitboxWidth = 16;
    const pipeWidth = 80;
    const pipeHeight = 192;
    const greenPlatformHeight = 32;
    const blueCeilingHeight = 32;
    const availableHeight = pipeHeight - greenPlatformHeight - blueCeilingHeight; // 192 - 32 - 32 = 128
    const numRows = Math.floor(availableHeight / hitboxWidth); // 128 / 16 = 8 rows

    // Optionally destroy bush container if present
    if ((floatingPipeContainer as any).bushContainer) {
      (floatingPipeContainer as any).bushContainer.destroy();
      (floatingPipeContainer as any).bushContainer = undefined;
    }

    // Create grid of purple hitboxes for this floating pipe (5 columns across, 8 rows)
    const pipeHitboxes: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = greenPlatformHeight + (row * hitboxWidth); // Start below green platform
        // Use bush texture instead of rectangle
        const hitbox = this.scene.add.image(0, 0, 'bush') as Phaser.GameObjects.Image & { canDamage?: boolean };
        hitbox.setOrigin(0, 0);
        hitbox.setDisplaySize(hitboxWidth, hitboxWidth);
        hitbox.setPosition(exactX, exactY);
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false); // Allow movement for gravity/velocity
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(true); // Enable gravity from creation
        (hitbox.body as Phaser.Physics.Arcade.Body).setGravityY(400);
        hitbox.canDamage = true;
        floatingPipeContainer.add(hitbox); // Add to container for rendering
        this.floatingPurpleHitboxes.add(hitbox); // Add to global group
        pipeHitboxes.push(hitbox);
      }
    }
    (floatingPipeContainer as any).purpleHitboxes = pipeHitboxes;
  }

  // Makes all purple hitboxes below the given hitbox in the same column fall and fade out (for floating pipes)
  public triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean, isDashTriggered: boolean = false) {
    this.scene.time.delayedCall(50, () => {
      this.pipes.getChildren().forEach((pipe: any) => {
        const floatingPipe = pipe as Phaser.GameObjects.Container;
        if (floatingPipe && (floatingPipe as any).purpleHitboxes) {
          const pipeHitboxes = (floatingPipe as any).purpleHitboxes as (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[];
          const hitIndex = pipeHitboxes.indexOf(hitHitbox);
          if (hitIndex !== -1) {
            const numColumns = 5; // Match floating pipe columns
            const hitCol = hitIndex % numColumns;
            pipeHitboxes.forEach((hitbox, index) => {
              const row = Math.floor(index / numColumns);
              const col = index % numColumns;
              if (col === hitCol) {
                this.floatingPurpleHitboxes.remove(hitbox);
                this.fallingPurpleHitboxes.add(hitbox);
                // Optionally add to a falling group if you want to track falling cubes
                if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                  hitbox.body.setGravityY(400);
                }
                this.scene.tweens.add({
                  targets: hitbox,
                  alpha: 0,
                  duration: 1000,
                  ease: 'Linear',
                });
              }
            });
            // After handling purple cubes below, check if the last column (col 0) was hit
            if (hitCol === 0 && floatingPipe && (floatingPipe as any).blueHitbox) {
              const blueHitbox = (floatingPipe as any).blueHitbox;
              if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                blueHitbox.body.setAllowGravity(true);
                blueHitbox.body.setGravityY(400);
                this.scene.tweens.add({
                  targets: blueHitbox,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                  onUpdate: () => {
                    if (!blueHitbox._scoreAdded && blueHitbox.alpha < 0.9 && (this.scene as any).increaseScore) {
                      (this.scene as any).increaseScore(10);
                      blueHitbox._scoreAdded = true;
                    }
                  },
                });
                this.scene.tweens.add({
                  targets: blueHitbox,
                  angle: -45,
                  duration: 500,
                  ease: 'Linear',
                });
              }
            }
            // Trigger fall for the green hitbox (platform) when the middle column is hit
            const middleColumn = Math.floor(numColumns / 2);
            if (hitCol === middleColumn && floatingPipe && (floatingPipe as any).greenHitbox) {
              const greenHitbox = (floatingPipe as any).greenHitbox;
              if (greenHitbox.body && greenHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                greenHitbox.body.setImmovable(false);
                greenHitbox.body.setAllowGravity(true);
                greenHitbox.body.setGravityY(800);
                greenHitbox.body.setVelocityY(-20);
                this.scene.time.delayedCall(100, () => {
                  if (greenHitbox.body && greenHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                    greenHitbox.body.setGravityY(800 * 3);
                  }
                });
                this.scene.tweens.add({
                  targets: greenHitbox,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                  onUpdate: () => {
                    if (!greenHitbox._scoreAdded && greenHitbox.alpha < 0.9 && (this.scene as any).increaseScore) {
                      (this.scene as any).increaseScore(10);
                      greenHitbox._scoreAdded = true;
                    }
                  },
                });
                this.scene.tweens.add({
                  targets: greenHitbox,
                  angle: -45,
                  duration: 500,
                  ease: 'Linear',
                });
              }
            }
          }
        }
      });
    });
  }

  // Remove pipes that are far behind the player (for recycling)
  public recyclePipes(playerX: number, recycleDistance: number = 100): void {
    const pipesToRemove: any[] = [];
    const cameraLeft = this.scene.cameras.main.worldView.x;
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < cameraLeft - recycleDistance) {
        console.log(`[PIPE RECYCLE DEBUG] pipe.x=${pipe.x}, cameraLeft=${cameraLeft}, recycleDistance=${recycleDistance}, threshold=${cameraLeft - recycleDistance}`);
        pipesToRemove.push(pipe);
      }
    });
    
    pipesToRemove.forEach(pipe => {
      // Remove associated green hitbox
      if ((pipe as any).greenHitbox) {
        this.greenHitboxes.remove((pipe as any).greenHitbox);
        (pipe as any).greenHitbox.destroy();
      }
      
      // Remove associated blue hitbox
      if ((pipe as any).blueHitbox) {
        this.blueHitboxes.remove((pipe as any).blueHitbox);
        (pipe as any).blueHitbox.destroy();
      }
      
      // Remove associated ledge grab hitbox
      if ((pipe as any).ledgeGrabHitbox) {
        this.ledgeGrabHitboxes.remove((pipe as any).ledgeGrabHitbox);
        (pipe as any).ledgeGrabHitbox.destroy();
      }
      
      // Remove associated purple hitboxes
      if ((pipe as any).purpleHitboxes) {
        (pipe as any).purpleHitboxes.forEach((hitbox: any) => {
          this.floatingPurpleHitboxes.remove(hitbox);
          hitbox.destroy();
        });
      }
      
      // Remove the pipe itself
      this.pipes.remove(pipe);
      pipe.destroy();
    });
    
    if (pipesToRemove.length > 0) {
      console.log(`[FLOATING PIPE MANAGER] Recycled ${pipesToRemove.length} pipes`);
    }
  }

  public getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x > rightMostX) {
        rightMostX = pipe.x;
      }
    });
    return rightMostX;
  }

  // Mark a pipe as having used ledge grab (prevents green box from falling)
  public markLedgeGrabUsed(pipeContainer: any): void {
    if (pipeContainer) {
      (pipeContainer as any).ledgeGrabUsed = true;
      console.log("[FLOATING PIPE MANAGER] Ledge grab marked as used for pipe");
    }
  }
}
