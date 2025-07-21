import Phaser from "phaser";

export default class FloatingPipeManager {
  private scene: Phaser.Scene;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  // Add a group for floating pipe purple cubes
  public floatingPurpleHitboxes: Phaser.Physics.Arcade.Group;
  public ledgeGrabHitboxes: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string, upperPipeManager: any, lowerPipeManager: any) {
    this.scene = scene;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.floatingPurpleHitboxes = this.scene.physics.add.group();
    this.ledgeGrabHitboxes = this.scene.physics.add.group();
  }

  // Create a floating pipe at the specified position
  createFloatingPipe(x: number, y: number): any {
    // Create main floating pipe container
    const floatingPipeContainer = this.scene.add.container(x, y);
    
    // Create green walkable platform on top
    const greenPlatform = this.scene.add.rectangle(
      40, 
      16, // Position at top of container
      80, 
      32, 
      0x66ff00
    );
    floatingPipeContainer.add(greenPlatform);
    
    // Create blue ceiling at the bottom
    const blueCeiling = this.scene.add.rectangle(
      40, 
      184, // Position at bottom of container (200 - 16)
      80, 
      32, 
      0x00ffff // Same cyan color as upper pipe blue hitbox
    );
    floatingPipeContainer.add(blueCeiling);
    
    // Create separate physics body for blue ceiling detection
    const blueHitbox = this.scene.add.rectangle(
      x + 40, // Absolute world position
      y + 184, // Absolute world position
      80, 
      32, 
      0x00ffff, // Same cyan color as upper pipe blue hitbox
      0.5 // Semi-transparent for debugging
    );
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.blueHitboxes.add(blueHitbox);
    (floatingPipeContainer as any).blueHitbox = blueHitbox;
    
    // Create separate physics body for green platform detection
    const greenHitbox = this.scene.add.rectangle(
      x + 40, // Absolute world position
      y + 16, // Absolute world position
      80, 
      32, 
      0x66ff00, 
      0.5 // Semi-transparent for debugging
    );
    this.scene.physics.add.existing(greenHitbox);
    (greenHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.greenHitboxes.add(greenHitbox);
    (floatingPipeContainer as any).greenHitbox = greenHitbox;
    
    // Set up physics for the container
    this.scene.physics.add.existing(floatingPipeContainer);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(80, 200);
    
    this.pipes.add(floatingPipeContainer as any);
    
    return floatingPipeContainer;
  }

  // Generate purple cubes for the floating pipe (between green and blue platforms)
  public generatePurpleCubesForFloatingPipe(floatingPipeContainer: any): void {
    // Check if purple cubes already exist for this pipe
    if ((floatingPipeContainer as any).purpleHitboxes && (floatingPipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = 5; // Match brown cube columns
    const hitboxWidth = 16;
    const pipeWidth = 80;
    const pipeHeight = 200;
    const greenPlatformHeight = 32;
    const blueCeilingHeight = 32;
    const availableHeight = pipeHeight - greenPlatformHeight - blueCeilingHeight; // 200 - 32 - 32 = 136
    const numRows = Math.floor(availableHeight / hitboxWidth); // 136 / 16 = 8 rows

    // Optionally destroy placeholder rectangle if present
    if ((floatingPipeContainer as any).placeholderRect) {
      (floatingPipeContainer as any).placeholderRect.destroy();
      (floatingPipeContainer as any).placeholderRect = undefined;
    }

    // Create grid of purple hitboxes for this floating pipe (5 columns across, 8 rows)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = greenPlatformHeight + (row * hitboxWidth); // Start below green platform

        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean };
        hitbox.setOrigin(0, 0);
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

  // Remove pipes that are far behind the player (for recycling)
  public recyclePipes(playerX: number, recycleDistance: number = 1000): void {
    const pipesToRemove: any[] = [];
    
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < playerX - recycleDistance) {
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
}
