import Phaser from "phaser";
import StaticPipeManager from "./StaticPipeManager";

export default class LowerPipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public maroonHitboxes: Phaser.Physics.Arcade.Group;
  public fallingMaroonHitboxes: Phaser.Physics.Arcade.Group;

  // Add these constants for column logic (same as original PipeManager)
  private static readonly PIPE_WIDTH = Math.ceil(78 / 16) * 16; // Always a multiple of 16
  // Width of each hitbox (maroon cube)
  private static readonly hitboxWidth = 16;
  // Dynamically calculated number of columns
  public static get numColumns() {
    return Math.floor(LowerPipeManager.PIPE_WIDTH / LowerPipeManager.hitboxWidth);
  }
  
  // Configurable fade duration for maroon cubes (in milliseconds)
  public static readonly MAROON_CUBE_FADE_DURATION = 1000;
  
  // Use centralized Y placement from StaticPipeManager
  public static get PIPE_HEIGHT() { return StaticPipeManager.getUpperPipeHeight(); }
  public static get PIPE_Y_POSITION() { return StaticPipeManager.getLowerPipeY(); }

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.maroonHitboxes = this.scene.physics.add.group();
    this.fallingMaroonHitboxes = this.scene.physics.add.group();
  }

  // Create a lower pipe that extends to the ground plane
  createLowerPipe(x: number, y: number): any {
    const blueWidth = LowerPipeManager.PIPE_WIDTH;
    

    
    // Create lower pipe as a container with orange rectangle - extend to ground
    const groundY = StaticPipeManager.getGroundY(); // Ground plane Y position
    const lowerPipeHeight = StaticPipeManager.getLowerPipeHeight(y); // Height needed to reach ground from pipe position
    
    const lowerPipeContainer = this.scene.add.container(x, y);
    const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, lowerPipeHeight, 0xff8c00);
    orangeRect.setOrigin(0, 0);
    orangeRect.setName('orangeRect'); // Give it a name for easy identification
    lowerPipeContainer.add(orangeRect);
    const redRect = this.scene.add.rectangle(0, 0, blueWidth, 16, 0xff0000, 0);
    redRect.setOrigin(0, 0);
    lowerPipeContainer.add(redRect);
    // Initialize empty maroon hitboxes array for lower pipe (will be populated on-demand)
    (lowerPipeContainer as any).maroonHitboxes = [];
    this.scene.physics.add.existing(lowerPipeContainer);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, lowerPipeHeight);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
    // Create separate hitbox for red rectangle
    const redHitbox = this.scene.add.rectangle(x, y, blueWidth, 16, 0x00ff00, 0.5);
    redHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(redHitbox);
    (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.pipes.add(lowerPipeContainer as any);
    this.greenHitboxes.add(redHitbox);
    (lowerPipeContainer as any).redHitbox = redHitbox;
    
    // Register lower pipe and hitbox with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(lowerPipeContainer);
      (this.scene as any).hitStop.register(redHitbox);
    }
    

    
    return lowerPipeContainer;
  }

  // Create a ground-based lower pipe that comes up from the ground plane
  createGroundPipe(x: number, height: number = 200): any {
    const blueWidth = LowerPipeManager.PIPE_WIDTH;
    

    
    // Ground plane is at Y=1000, so the pipe starts there and goes up
    const groundY = StaticPipeManager.getGroundY();
    
    // Create ground pipe as a container with orange rectangle
    const groundPipeContainer = this.scene.add.container(x, groundY);
    const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, height, 0xff8c00);
    orangeRect.setOrigin(0, 0);
    orangeRect.setName('orangeRect'); // Give it a name for easy identification
    groundPipeContainer.add(orangeRect);
    const redRect = this.scene.add.rectangle(0, 0, blueWidth, 16, 0xff0000, 0);
    redRect.setOrigin(0, 0);
    groundPipeContainer.add(redRect);
    // Initialize empty maroon hitboxes array for ground pipe (will be populated on-demand)
    (groundPipeContainer as any).maroonHitboxes = [];
    this.scene.physics.add.existing(groundPipeContainer);
    (groundPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (groundPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, height);
    (groundPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
    // Create separate hitbox for red rectangle (green platform)
    const redHitbox = this.scene.add.rectangle(x, groundY, blueWidth, 16, 0x00ff00, 0.5);
    redHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(redHitbox);
    (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.pipes.add(groundPipeContainer as any);
    this.greenHitboxes.add(redHitbox);
    (groundPipeContainer as any).redHitbox = redHitbox;
    
    // Register ground pipe and hitbox with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(groundPipeContainer);
      (this.scene as any).hitStop.register(redHitbox);
    }
    

    
    return groundPipeContainer;
  }

  // Generate maroon cubes for a specific lower pipe (same logic as original PipeManager)
  public generateMaroonCubesForPipe(pipeContainer: any): void {
    console.log("[LOWER PIPE MANAGER] generateMaroonCubesForPipe called");
    console.log("[LOWER PIPE MANAGER] pipeContainer:", pipeContainer);
    console.log("[LOWER PIPE MANAGER] redHitbox:", (pipeContainer as any).redHitbox);
    console.log("[LOWER PIPE MANAGER] blueHitbox:", (pipeContainer as any).blueHitbox);
    
    // Safety check: only generate maroon cubes for lower pipe containers
    // Lower pipes have redHitbox, upper pipes have blueHitbox
    if (!(pipeContainer as any).redHitbox) {
      console.log("[LOWER PIPE MANAGER] Skipping - no redHitbox found (this might be an upper pipe)");
      return; // This is an upper pipe, skip
    }

    // Check if maroon cubes already exist for this pipe
    if ((pipeContainer as any).maroonHitboxes && (pipeContainer as any).maroonHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = LowerPipeManager.numColumns;
    const hitboxWidth = LowerPipeManager.hitboxWidth;
    

    
    // Destroy the orange rectangle for maroon cube generation
    const orangeRect = pipeContainer.getByName('orangeRect');
    if (orangeRect) {
      orangeRect.destroy();
    }
    
    // Calculate dynamic number of rows based on pipe height
    const pipeHeight = (pipeContainer.body as Phaser.Physics.Arcade.Body).height;
    const availableHeight = pipeHeight - 16; // Subtract red rectangle height
    const numRows = Math.floor(availableHeight / hitboxWidth);
    

    
    // Create grid of maroon hitboxes for this pipe (numColumns across, dynamic rows)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = 16 + (row * hitboxWidth); // Start at 16 (below red rectangle)
        
        // Safety check: ensure maroon cubes don't extend beyond pipe bounds
        if (exactY + hitboxWidth > pipeHeight) {
          console.warn(`[LOWER PIPE MANAGER] Skipping maroon cube at row ${row} - would exceed pipe bounds`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0x8b0000, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // maroon, fully opaque
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        hitbox.canDamage = true;
        pipeContainer.add(hitbox); // Add to container first
        this.maroonHitboxes.add(hitbox); // Then add to global group
        pipeHitboxes.push(hitbox);
      }
    }
    (pipeContainer as any).maroonHitboxes = pipeHitboxes;

    // Register new maroon cubes with hitStop if available
    if ((this.scene as any).hitStop) {
      pipeHitboxes.forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
    }
  }

  /**
   * Makes all maroon hitboxes above the given hitbox in the same column fall and fade out.
   * @param hitHitbox The hit maroon hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over
   * @param isDashTriggered Whether this was triggered by dash
   */
  public triggerFallForHitboxesAbove(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean, isDashTriggered: boolean = false) {
    this.scene.time.delayedCall(50, () => {
      this.pipes.getChildren().forEach((pipe: any) => {
        const lowerPipe = pipe as Phaser.GameObjects.Container;
        if (lowerPipe && (lowerPipe as any).maroonHitboxes) {
          const pipeHitboxes = (lowerPipe as any).maroonHitboxes as Phaser.GameObjects.Rectangle[];
          const hitIndex = pipeHitboxes.indexOf(hitHitbox);
          if (hitIndex !== -1) {
            const numColumns = LowerPipeManager.numColumns;
            const hitRow = Math.floor(hitIndex / numColumns);
            const hitCol = hitIndex % numColumns;
        
            
                         pipeHitboxes.forEach((hitbox, index) => {
               const row = Math.floor(index / numColumns);
               const col = index % numColumns;
               // Trigger fall for cubes ABOVE the hit cube (row < hitRow) in the same column
               // Skip boxes that were attacked by the attack hitbox
               if (col === hitCol && row < hitRow && !(hitbox as any).wasAttacked) {
             
                 if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                   // Move to falling group to separate from container physics
                   this.maroonHitboxes.remove(hitbox);
                   this.fallingMaroonHitboxes.add(hitbox);
                   
                   hitbox.body.setAllowGravity(true);
                   // Add a tiny upward velocity before falling
                   hitbox.body.setVelocityY(-50);
                   hitbox.body.setGravityY(800);
                   
                   // Apply gravity multiplier after initial upward movement
                   this.scene.time.delayedCall(100, () => {
                     if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                       hitbox.body.setGravityY(800 * 3);
                     }
                   });
                 }
                 // Only start fading when Y velocity becomes positive
                 const checkVelocityAndFade = () => {
                   if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                     if (hitbox.body.velocity.y > 0) {
                       this.scene.tweens.add({
                         targets: hitbox,
                         alpha: 0,
                         duration: LowerPipeManager.MAROON_CUBE_FADE_DURATION,
                         ease: 'Linear',
                       });
                     } else {
                       // Check again in 50ms if velocity is still negative
                       this.scene.time.delayedCall(50, checkVelocityAndFade);
                     }
                   }
                 };
                 checkVelocityAndFade();
               }
             });
             
             // Trigger fall for the green hitbox (red rectangle) associated with this pipe only if the rightmost column (col 3) is hit
             if (hitCol === 3 && lowerPipe && (lowerPipe as any).redHitbox) {
               const redHitbox = (lowerPipe as any).redHitbox;
           
               if (redHitbox.body && redHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                 // Add a tiny upward velocity before falling
                 redHitbox.body.setVelocityY(-20);
                 redHitbox.body.setGravityY(800);
                 
                 // Apply gravity multiplier after initial upward movement
                 this.scene.time.delayedCall(100, () => {
                   if (redHitbox.body && redHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                     redHitbox.body.setGravityY(800 * 3);
                   }
                 });
                 
                 this.scene.tweens.add({
                   targets: redHitbox,
                   alpha: 0,
                   duration: 500,
                   ease: 'Linear',
                 });
                 if (!isGameOver && !isDashTriggered) {
                   this.scene.tweens.add({
                     targets: redHitbox,
                     angle: -45, // Rotate in the opposite direction from blue hitbox
                     duration: 500,
                     ease: 'Linear',
                   });
                 }
               }
             }
             
             // Fade out the orange rectangle (upper column) when maroon cubes are knocked away
             const orangeRect = lowerPipe.getByName('orangeRect');
             if (orangeRect) {
               this.scene.tweens.add({
                 targets: orangeRect,
                 alpha: 0,
                 duration: LowerPipeManager.MAROON_CUBE_FADE_DURATION,
                 ease: 'Linear',
               });
             }
           }
         }
       });
     });
   }

  // Remove pipes that are far behind the player (for chunk recycling)
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
      
      // Remove associated hitboxes
      if ((pipe as any).redHitbox) {
        this.greenHitboxes.remove((pipe as any).redHitbox);
        (pipe as any).redHitbox.destroy();
      }
      
      // Remove the pipe itself
      this.pipes.remove(pipe);
      pipe.destroy();
    });
    
    if (pipesToRemove.length > 0) {
      console.log(`[LOWER PIPE MANAGER] Recycled ${pipesToRemove.length} pipes`);
    }
  }

  // Get the rightmost pipe position (for determining where to place new pipes)
  public getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x > rightMostX) {
        rightMostX = pipe.x;
      }
    });
    return rightMostX;
  }

  // Set current difficulty
  public setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
  }
} 