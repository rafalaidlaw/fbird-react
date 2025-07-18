import Phaser from "phaser";

export default class FloatingPipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  public maroonHitboxes: Phaser.Physics.Arcade.Group;
  public purpleHitboxes: Phaser.Physics.Arcade.Group;
  public fallingMaroonHitboxes: Phaser.Physics.Arcade.Group;
  public fallingPurpleHitboxes: Phaser.Physics.Arcade.Group;
  public ledgeGrabHitboxes: Phaser.Physics.Arcade.Group;

  // Constants for floating pipe structure
  private static readonly PIPE_WIDTH = Math.ceil(78 / 16) * 16; // Always a multiple of 16
  private static readonly hitboxWidth = 16;
  public static get numColumns() {
    return Math.floor(FloatingPipeManager.PIPE_WIDTH / FloatingPipeManager.hitboxWidth);
  }
  
  // Floating pipe dimensions (5x5 grid)
  private static readonly FLOATING_PIPE_SIZE = 5 * FloatingPipeManager.hitboxWidth; // 80px
  private static readonly HALF_PIPE_HEIGHT = FloatingPipeManager.FLOATING_PIPE_SIZE / 2; // 40px
  
  // Configurable fade durations
  public static readonly MAROON_CUBE_FADE_DURATION = 1000;
  public static readonly PURPLE_CUBE_FADE_DURATION = 1000;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.maroonHitboxes = this.scene.physics.add.group();
    this.purpleHitboxes = this.scene.physics.add.group();
    this.fallingMaroonHitboxes = this.scene.physics.add.group();
    this.fallingPurpleHitboxes = this.scene.physics.add.group();
    this.ledgeGrabHitboxes = this.scene.physics.add.group();
  }

  // Create a floating pipe at the specified position
  createFloatingPipe(x: number, y: number): any {
    const pipeWidth = FloatingPipeManager.PIPE_WIDTH;
    const pipeHeight = FloatingPipeManager.FLOATING_PIPE_SIZE;
    const halfHeight = FloatingPipeManager.HALF_PIPE_HEIGHT;
    
    // Create main floating pipe container
    const floatingPipeContainer = this.scene.add.container(x, y);
    
    // Create upper pipe half (top section)
    const upperOrangeRect = this.scene.add.rectangle(0, 0, pipeWidth, halfHeight, 0xff8c00);
    upperOrangeRect.setOrigin(0, 0);
    upperOrangeRect.setName('upperOrangeRect');
    floatingPipeContainer.add(upperOrangeRect);
    
    // Create green platform for upper half
    const greenRect = this.scene.add.rectangle(0, 0, pipeWidth, 32, 0xff0000, 0);
    greenRect.setOrigin(0, 0);
    floatingPipeContainer.add(greenRect);
    
    // Create separate hitbox for green platform
    const greenHitbox = this.scene.add.rectangle(x, y, pipeWidth, 32, 0x00ff00, 0.5);
    greenHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(greenHitbox);
    (greenHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.greenHitboxes.add(greenHitbox);
    (floatingPipeContainer as any).greenHitbox = greenHitbox;
    
    // Create lower pipe half (bottom section)
    const lowerOrangeRect = this.scene.add.rectangle(0, halfHeight, pipeWidth, halfHeight, 0xff8c00);
    lowerOrangeRect.setOrigin(0, 0);
    lowerOrangeRect.setName('lowerOrangeRect');
    floatingPipeContainer.add(lowerOrangeRect);
    
    // Create blue platform for lower half
    const blueRect = this.scene.add.rectangle(0, halfHeight, pipeWidth, 32, 0x0000ff, 0);
    blueRect.setOrigin(0, 0);
    floatingPipeContainer.add(blueRect);
    
    // Create separate hitbox for blue platform
    const blueHitbox = this.scene.add.rectangle(x, y + halfHeight, pipeWidth, 32, 0x00ffff, 0.5);
    blueHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.blueHitboxes.add(blueHitbox);
    (floatingPipeContainer as any).blueHitbox = blueHitbox;
    
    // Create pink LedgeGrab hitbox at the left edge of the green platform
    const ledgeGrabHitbox = this.scene.add.rectangle(x - 8, y, 8, 16, 0xff69b4, 0.7);
    ledgeGrabHitbox.setOrigin(0, 0);
    ledgeGrabHitbox.setName('LedgeGrab');
    this.scene.physics.add.existing(ledgeGrabHitbox);
    (ledgeGrabHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.ledgeGrabHitboxes.add(ledgeGrabHitbox);
    (floatingPipeContainer as any).ledgeGrabHitbox = ledgeGrabHitbox;
    
    // Initialize empty cube arrays
    (floatingPipeContainer as any).maroonHitboxes = [];
    (floatingPipeContainer as any).purpleHitboxes = [];
    
    // Set up physics for the container
    this.scene.physics.add.existing(floatingPipeContainer);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(pipeWidth, pipeHeight);
    
    this.pipes.add(floatingPipeContainer as any);
    
    // Register with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(floatingPipeContainer);
      (this.scene as any).hitStop.register(greenHitbox);
      (this.scene as any).hitStop.register(blueHitbox);
    }
    
    return floatingPipeContainer;
  }

  // Generate maroon cubes for the upper half of a floating pipe
  public generateMaroonCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate for floating pipe containers
    if (!(pipeContainer as any).greenHitbox || !(pipeContainer as any).blueHitbox) {
      return; // This is not a floating pipe, skip
    }

    // Check if maroon cubes already exist for this pipe
    if ((pipeContainer as any).maroonHitboxes && (pipeContainer as any).maroonHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = FloatingPipeManager.numColumns;
    const hitboxWidth = FloatingPipeManager.hitboxWidth;
    const halfHeight = FloatingPipeManager.HALF_PIPE_HEIGHT;
    
    // Destroy the upper orange rectangle for maroon cube generation
    const upperOrangeRect = pipeContainer.getByName('upperOrangeRect');
    if (upperOrangeRect) {
      upperOrangeRect.destroy();
    }
    
    // Create 5x5 grid of maroon hitboxes for upper half
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = 32 + (row * hitboxWidth); // Start at 32 (below green platform)
        
        // Safety check: ensure maroon cubes don't extend beyond upper half
        if (exactY + hitboxWidth > halfHeight) {
          console.warn(`[FLOATING PIPE MANAGER] Skipping maroon cube at row ${row} - would exceed upper half bounds`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0x8b0000, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean };
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false);
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        hitbox.canDamage = true;
        pipeContainer.add(hitbox);
        this.maroonHitboxes.add(hitbox);
        pipeHitboxes.push(hitbox);
      }
    }
    (pipeContainer as any).maroonHitboxes = pipeHitboxes;

    // Register new maroon cubes with hitStop if available
    if ((this.scene as any).hitStop) {
      pipeHitboxes.forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
    }

    // Destroy the ledge grab hitbox since maroon cubes have been spawned
    if ((pipeContainer as any).ledgeGrabHitbox) {
      console.log("[FLOATING PIPE MANAGER] Destroying ledge grab hitbox due to maroon cube spawn");
      this.ledgeGrabHitboxes.remove((pipeContainer as any).ledgeGrabHitbox);
      (pipeContainer as any).ledgeGrabHitbox.destroy();
      (pipeContainer as any).ledgeGrabHitbox = null;
    }
  }

  // Generate purple cubes for the lower half of a floating pipe
  public generatePurpleCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate for floating pipe containers
    if (!(pipeContainer as any).greenHitbox || !(pipeContainer as any).blueHitbox) {
      return; // This is not a floating pipe, skip
    }

    // Check if purple cubes already exist for this pipe
    if ((pipeContainer as any).purpleHitboxes && (pipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = FloatingPipeManager.numColumns;
    const hitboxWidth = FloatingPipeManager.hitboxWidth;
    const halfHeight = FloatingPipeManager.HALF_PIPE_HEIGHT;
    
    // Destroy the lower orange rectangle for purple cube generation
    const lowerOrangeRect = pipeContainer.getByName('lowerOrangeRect');
    if (lowerOrangeRect) {
      lowerOrangeRect.destroy();
    }
    
    // Create 5x5 grid of purple hitboxes for lower half
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = halfHeight + 32 + (row * hitboxWidth); // Start at halfHeight + 32 (below blue platform)
        
        // Safety check: ensure purple cubes don't extend beyond lower half
        if (exactY + hitboxWidth > FloatingPipeManager.FLOATING_PIPE_SIZE) {
          console.warn(`[FLOATING PIPE MANAGER] Skipping purple cube at row ${row} - would exceed lower half bounds`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0x800080, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean };
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false);
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        hitbox.canDamage = true;
        pipeContainer.add(hitbox);
        this.purpleHitboxes.add(hitbox);
        pipeHitboxes.push(hitbox);
      }
    }
    (pipeContainer as any).purpleHitboxes = pipeHitboxes;

    // Register new purple cubes with hitStop if available
    if ((this.scene as any).hitStop) {
      pipeHitboxes.forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
    }
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
      // Clean up maroon cubes if they exist
      if ((pipe as any).maroonHitboxes) {
        const pipeHitboxes = (pipe as any).maroonHitboxes as Phaser.GameObjects.Rectangle[];
        pipeHitboxes.forEach((hitbox) => {
          this.maroonHitboxes.remove(hitbox);
          hitbox.destroy();
        });
      }
      
      // Clean up purple cubes if they exist
      if ((pipe as any).purpleHitboxes) {
        const pipeHitboxes = (pipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
        pipeHitboxes.forEach((hitbox) => {
          this.purpleHitboxes.remove(hitbox);
          hitbox.destroy();
        });
      }
      
      // Remove associated hitboxes
      if ((pipe as any).greenHitbox) {
        this.greenHitboxes.remove((pipe as any).greenHitbox);
        (pipe as any).greenHitbox.destroy();
      }
      
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

  public setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
  }
} 