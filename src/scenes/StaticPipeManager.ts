import Phaser from "phaser";

export default class StaticPipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  public purpleHitboxes: Phaser.Physics.Arcade.Group;
  public maroonHitboxes: Phaser.Physics.Arcade.Group;
  public fallingMaroonHitboxes: Phaser.Physics.Arcade.Group;
  public fallingPurpleHitboxes: Phaser.Physics.Arcade.Group;

  // Add these constants for column logic (same as original PipeManager)
  private static readonly numColumns = 4;
  private static readonly hitboxWidth = 16;
  
  // Configurable fade duration for purple cubes (in milliseconds)
  public static readonly PURPLE_CUBE_FADE_DURATION = 1000;
  
  // Configurable fade duration for maroon cubes (in milliseconds)
  public static readonly MAROON_CUBE_FADE_DURATION = 1000;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.purpleHitboxes = this.scene.physics.add.group();
    this.maroonHitboxes = this.scene.physics.add.group();
    this.fallingMaroonHitboxes = this.scene.physics.add.group();
    this.fallingPurpleHitboxes = this.scene.physics.add.group();
  }

  // Create a single pipe pair at a specific position (for chunk-based system)
  // Create an upper pipe that extends to the sky plane
  createUpperPipe(x: number, y: number): any {
    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    

    
    // Create upper pipe as a container with orange rectangle - extend to sky plane
    const skyY = -1000; // Sky plane Y position
    const upperPipeHeight = y - skyY; // Height needed to reach sky plane from pipe position
    const upperPipeContainer = this.scene.add.container(x, y);
    // Add orange rectangle to container - extend to sky plane
    const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, upperPipeHeight, 0xff8c00, 0); // alpha 0
    upperOrangeRect.setOrigin(0, 0); // Change to top-left origin so it extends downward
    upperOrangeRect.setPosition(0, -upperPipeHeight); // Position it to extend from pipe position down to sky
    upperPipeContainer.add(upperOrangeRect);
    // Add blue rectangle as child of the container
    const blueRect = this.scene.add.rectangle(0, 0, blueWidth, 32, 0x0000ff, 0);
    blueRect.setOrigin(0, 0);
    upperPipeContainer.add(blueRect);
    // Create separate hitbox for blue rectangle (positioned at bottom of purple cube column)
    const purpleColumnHeight = 23 * hitboxWidth; // 23 rows × 16px each = 368px
    const purpleColumnBottom = -288 + purpleColumnHeight; // -288 + 368 = 80
    const blueHitbox = this.scene.add.rectangle(x - 2, y + purpleColumnBottom, blueWidth, 16, 0x00ffff, 1);
    blueHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.blueHitboxes.add(blueHitbox);
    // Initialize empty purple hitboxes array (will be populated on-demand)
    (upperPipeContainer as any).purpleHitboxes = [];
    
    // Create placeholder orange rectangle covering the purple cube area
    const purpleAreaWidth = blueWidth; // Same as blue hitbox width
    const purpleAreaHeight = 23 * hitboxWidth; // 23 rows × 16px = 368px
    const purpleAreaX = -2; // Same X offset as purple cubes
    const purpleAreaY = -288;
    const placeholderRect = this.scene.add.rectangle(purpleAreaX, purpleAreaY, purpleAreaWidth, purpleAreaHeight, 0xff8c00, 1);
    placeholderRect.setOrigin(0, 0);
    upperPipeContainer.add(placeholderRect);
    (upperPipeContainer as any).placeholderRect = placeholderRect;
    this.scene.physics.add.existing(upperPipeContainer);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // Calculate total height: pipe extends from sky plane (Y=-1000) to pipe position (Y=y)
    // Total span: from -upperPipeHeight to +96 (blue hitbox)
    const totalContainerHeight = upperPipeHeight + 96; // pipe height + blue hitbox area
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -upperPipeHeight);
    this.pipes.add(upperPipeContainer as any);
    
    (upperPipeContainer as any).blueHitbox = blueHitbox;
    (upperPipeContainer as any).blueRect = blueRect;
    (upperPipeContainer as any).purpleHitbox = this.purpleHitboxes;
    
    // Register upper pipe and hitbox with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(upperPipeContainer);
      (this.scene as any).hitStop.register(blueHitbox);
    }
    

    
    return upperPipeContainer;
  }

  // Create a lower pipe that extends to the ground plane
  createLowerPipe(x: number, y: number): any {
    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    

    
    // Create lower pipe as a container with orange rectangle - extend to ground
    const groundY = 1000; // Ground plane Y position
    const lowerPipeHeight = groundY - y; // Height needed to reach ground from pipe position
    
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

  // Legacy method - kept for backward compatibility
  createPipePair(x: number, y: number, pipeVerticalDistance: number = 200): { upperPipe: any, lowerPipe: any } {
    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    

    
    // Create upper pipe as a container with orange rectangle - extend to sky plane
    const skyY = -1000; // Sky plane Y position
    const upperPipeHeight = y - skyY; // Height needed to reach sky plane from pipe position
    const upperPipeContainer = this.scene.add.container(x, y);
    // Add orange rectangle to container - extend to sky plane
    const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, upperPipeHeight, 0xff8c00, 0); // alpha 0
    upperOrangeRect.setOrigin(0, 0); // Change to top-left origin so it extends downward
    upperOrangeRect.setPosition(0, -upperPipeHeight); // Position it to extend from pipe position down to sky
    upperPipeContainer.add(upperOrangeRect);
    // Add blue rectangle as child of the container
    const blueRect = this.scene.add.rectangle(0, 0, blueWidth, 32, 0x0000ff, 0);
    blueRect.setOrigin(0, 0);
    upperPipeContainer.add(blueRect);
    // Create separate hitbox for blue rectangle (positioned at bottom of purple cube column)
    const purpleColumnHeight = 23 * hitboxWidth; // 23 rows × 16px each = 368px
    const purpleColumnBottom = -288 + purpleColumnHeight; // -288 + 368 = 80
    const blueHitbox = this.scene.add.rectangle(x - 2, y + purpleColumnBottom, blueWidth, 16, 0x00ffff, 1);
    blueHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.blueHitboxes.add(blueHitbox);
    // Initialize empty purple hitboxes array (will be populated on-demand)
    (upperPipeContainer as any).purpleHitboxes = [];
    
    // Create placeholder orange rectangle covering the purple cube area
    const purpleAreaWidth = blueWidth; // Same as blue hitbox width
    const purpleAreaHeight = 23 * hitboxWidth; // 23 rows × 16px = 368px
    const purpleAreaX = -2; // Same X offset as purple cubes
    const purpleAreaY = -288;
    const placeholderRect = this.scene.add.rectangle(purpleAreaX, purpleAreaY, purpleAreaWidth, purpleAreaHeight, 0xff8c00, 1);
    placeholderRect.setOrigin(0, 0);
    upperPipeContainer.add(placeholderRect);
    (upperPipeContainer as any).placeholderRect = placeholderRect;
    this.scene.physics.add.existing(upperPipeContainer);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // Calculate total height: pipe extends from sky plane (Y=-1000) to pipe position (Y=y)
    // Total span: from -upperPipeHeight to +96 (blue hitbox)
    const totalContainerHeight = upperPipeHeight + 96; // pipe height + blue hitbox area
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -upperPipeHeight);
    this.pipes.add(upperPipeContainer as any);
    
    // Create lower pipe as a container with orange rectangle - extend to ground
    const groundY = 1000; // Ground plane Y position
    const lowerPipeY = y + pipeVerticalDistance; // Top of the lower pipe
    const lowerPipeHeight = groundY - lowerPipeY; // Height needed to reach ground
    
    const lowerPipeContainer = this.scene.add.container(x, lowerPipeY);
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
    const redHitbox = this.scene.add.rectangle(x, lowerPipeY, blueWidth, 16, 0x00ff00, 0.5);
    redHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(redHitbox);
    (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.pipes.add(lowerPipeContainer as any);
    this.greenHitboxes.add(redHitbox);
    (lowerPipeContainer as any).redHitbox = redHitbox;
    (upperPipeContainer as any).blueHitbox = blueHitbox;
    (upperPipeContainer as any).blueRect = blueRect;
    (upperPipeContainer as any).purpleHitbox = this.purpleHitboxes;
    
    // Register all pipes and hitboxes with hitStop if available
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(upperPipeContainer);
      (this.scene as any).hitStop.register(lowerPipeContainer);
      (this.scene as any).hitStop.register(blueHitbox);
      (this.scene as any).hitStop.register(redHitbox);
    }
    

    
    return { upperPipe: upperPipeContainer, lowerPipe: lowerPipeContainer };
  }

  // Create a ground-based lower pipe that comes up from the ground plane
  createGroundPipe(x: number, height: number = 200): any {
    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    

    
    // Ground plane is at Y=1000, so the pipe starts there and goes up
    const groundY = 1000;
    
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

  // Generate purple cubes for a specific pipe (same logic as original PipeManager)
  public generatePurpleCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate purple cubes for upper pipe containers
    // Upper pipes have blueHitbox, lower pipes have redHitbox
    if (!(pipeContainer as any).blueHitbox) {

      return; // This is a lower pipe, skip
    }

    // Check if purple cubes already exist for this pipe
    if ((pipeContainer as any).purpleHitboxes && (pipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    

    
    // Destroy the placeholder orange rectangle
    if ((pipeContainer as any).placeholderRect) {
      (pipeContainer as any).placeholderRect.destroy();
      (pipeContainer as any).placeholderRect = undefined;
    }
    
    // Create grid of colored hitboxes for this pipe (numColumns across, 23 down)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    const maxAllowedY = -288 + (22 * hitboxWidth); // Last row should be at Y = 64
    
    for (let row = 0; row < 23; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position with bounds checking
        const exactX = (col * hitboxWidth) - 2;
        const exactY = -288 + (row * hitboxWidth);
        
        // Safety check: ensure purple cubes don't extend below the intended area
        if (exactY > maxAllowedY) {
          console.warn(`[STATIC PIPE MANAGER] Skipping purple cube at row ${row} - would exceed bounds (Y: ${exactY} > ${maxAllowedY})`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // orange, fully opaque
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false); // Allow movement for gravity/velocity
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        hitbox.canDamage = true;
        pipeContainer.add(hitbox); // Add to container first
        this.purpleHitboxes.add(hitbox); // Then add to global group
        pipeHitboxes.push(hitbox);
      }
    }
    (pipeContainer as any).purpleHitboxes = pipeHitboxes;

    // Register new purple cubes with hitStop if available
    if ((this.scene as any).hitStop) {
      pipeHitboxes.forEach(hitbox => (this.scene as any).hitStop.register(hitbox));
    }
  }

  // Generate maroon cubes for a specific lower pipe (same logic as original PipeManager)
  public generateMaroonCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate maroon cubes for lower pipe containers
    // Lower pipes have redHitbox, upper pipes have blueHitbox
    if (!(pipeContainer as any).redHitbox) {

      return; // This is an upper pipe, skip
    }

    // Check if maroon cubes already exist for this pipe
    if ((pipeContainer as any).maroonHitboxes && (pipeContainer as any).maroonHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = StaticPipeManager.numColumns;
    const hitboxWidth = StaticPipeManager.hitboxWidth;
    

    
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
          console.warn(`[STATIC PIPE MANAGER] Skipping maroon cube at row ${row} - would exceed pipe bounds`);
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

  // Remove pipes that are far behind the player (for chunk recycling)
  public recyclePipes(playerX: number, recycleDistance: number = 1000): void {
    const pipesToRemove: any[] = [];
    
    this.pipes.getChildren().forEach((pipe: any) => {
      if (pipe.x < playerX - recycleDistance) {
        pipesToRemove.push(pipe);
      }
    });
    
    pipesToRemove.forEach(pipe => {
      // Clean up purple cubes if they exist
      if ((pipe as any).purpleHitboxes) {
        const pipeHitboxes = (pipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
        pipeHitboxes.forEach((hitbox) => {
          this.purpleHitboxes.remove(hitbox);
          hitbox.destroy();
        });
      }
      
      // Clean up maroon cubes if they exist
      if ((pipe as any).maroonHitboxes) {
        const pipeHitboxes = (pipe as any).maroonHitboxes as Phaser.GameObjects.Rectangle[];
        pipeHitboxes.forEach((hitbox) => {
          this.maroonHitboxes.remove(hitbox);
          hitbox.destroy();
        });
      }
      
      // Remove associated hitboxes
      if ((pipe as any).blueHitbox) {
        this.blueHitboxes.remove((pipe as any).blueHitbox);
        (pipe as any).blueHitbox.destroy();
      }
      if ((pipe as any).redHitbox) {
        this.greenHitboxes.remove((pipe as any).redHitbox);
        (pipe as any).redHitbox.destroy();
      }
      
      // Remove the pipe itself
      this.pipes.remove(pipe);
      pipe.destroy();
    });
    
    if (pipesToRemove.length > 0) {
  
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

  // Stop all blue box animations (same as original PipeManager)
  public stopAllBlueBoxAnimations(): void {
    this.blueHitboxes.getChildren().forEach((hitbox) => {
      const blueHitbox = hitbox as Phaser.Physics.Arcade.Sprite;
      if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        blueHitbox.body.setGravityY(0);
        blueHitbox.body.setVelocityY(0);
        this.scene.tweens.killTweensOf(blueHitbox);
        blueHitbox.angle = 0;
      }
    });
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
            const numColumns = StaticPipeManager.numColumns;
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
                         duration: StaticPipeManager.MAROON_CUBE_FADE_DURATION,
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
           }
         }
       });
     });
   }

  /**
   * Makes all purple hitboxes below the given hitbox in the same column fall and fade out.
   * @param hitHitbox The hit purple hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over (affects blue box animation)
   * @param isDashTriggered Whether this was triggered by dash (affects blue box rotation)
   */
  public triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean, isDashTriggered: boolean = false) {
    this.scene.time.delayedCall(50, () => {
      this.pipes.getChildren().forEach((pipe: any) => {
        const upperPipe = pipe as Phaser.GameObjects.Container;
        if (upperPipe && (upperPipe as any).purpleHitboxes) {
          const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
          const hitIndex = pipeHitboxes.indexOf(hitHitbox);
          if (hitIndex !== -1) {
            const numColumns = StaticPipeManager.numColumns;
            const hitRow = Math.floor(hitIndex / numColumns);
            const hitCol = hitIndex % numColumns;
            pipeHitboxes.forEach((hitbox, index) => {
              const row = Math.floor(index / numColumns);
              const col = index % numColumns;
              if (col === hitCol && row > hitRow) {
                // Move to falling group to prevent collision with player
                this.purpleHitboxes.remove(hitbox);
                this.fallingPurpleHitboxes.add(hitbox);
                
                if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                  hitbox.body.setGravityY(400);
                }
                this.scene.tweens.add({
                  targets: hitbox,
                  alpha: 0,
                  duration: StaticPipeManager.PURPLE_CUBE_FADE_DURATION,
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
                if (!isGameOver && !isDashTriggered) {
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
                if (!isGameOver && !isDashTriggered) {
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