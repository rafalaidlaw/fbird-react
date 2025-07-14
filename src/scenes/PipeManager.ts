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
  public maroonHitboxes: Phaser.Physics.Arcade.Group;
  public fallingMaroonHitboxes: Phaser.Physics.Arcade.Group;

  // Add these constants for column logic
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
      const blueRect = this.scene.add.rectangle(0, 0, blueWidth, 32, 0x0000ff, 0);
      blueRect.setOrigin(0, 0);
      upperPipeContainer.add(blueRect);
      // Create separate hitbox for blue rectangle (positioned at bottom of purple cube column)
      const purpleColumnHeight = 23 * hitboxWidth; // 23 rows × 16px each = 368px
      const purpleColumnBottom = -288 + purpleColumnHeight; // -288 + 368 = 80
      const blueHitbox = this.scene.add.rectangle(0, purpleColumnBottom, blueWidth, 16, 0x00ffff, 1);
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
      const purpleAreaY = -288; // Same Y as purple cube area
      const placeholderRect = this.scene.add.rectangle(purpleAreaX, purpleAreaY, purpleAreaWidth, purpleAreaHeight, 0xff8c00, 1);
      placeholderRect.setOrigin(0, 0);
      upperPipeContainer.add(placeholderRect);
      (upperPipeContainer as any).placeholderRect = placeholderRect;
      this.scene.physics.add.existing(upperPipeContainer);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      // Calculate total height: orange rect goes from -320 to 0, purple cubes go to +80, blue hitbox to +96
      // Total span: from -320 to +96 = 416px total height
      const totalContainerHeight = 416;
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
      (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -320);
      this.pipes.add(upperPipeContainer as any);
      // Create lower pipe as a container with orange rectangle
      const lowerPipeContainer = this.scene.add.container(0, 0);
      const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00);
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
      // Purple hitboxes will be registered when generated on-demand
      // Maroon hitboxes will be registered when generated on-demand
    }
  }

  // Generate purple cubes for a specific pipe (called on-demand)
  public generatePurpleCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate purple cubes for upper pipe containers
    // Upper pipes have blueHitbox, lower pipes have redHitbox
    if (!(pipeContainer as any).blueHitbox) {
      console.log('[PIPE MANAGER] Skipping purple cube generation - not an upper pipe container');
      return; // This is a lower pipe, skip
    }

    // Check if purple cubes already exist for this pipe
    if ((pipeContainer as any).purpleHitboxes && (pipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = PipeManager.numColumns;
    const hitboxWidth = PipeManager.hitboxWidth;
    
    console.log('[PIPE MANAGER] Generating purple cubes for pipe');
    
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
          console.warn(`[PIPE MANAGER] Skipping purple cube at row ${row} - would exceed bounds (Y: ${exactY} > ${maxAllowedY})`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // orange, fully opaque
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
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

  // Generate maroon cubes for a specific lower pipe (called on-demand)
  public generateMaroonCubesForPipe(pipeContainer: any): void {
    // Safety check: only generate maroon cubes for lower pipe containers
    // Lower pipes have redHitbox, upper pipes have blueHitbox
    if (!(pipeContainer as any).redHitbox) {
      console.log('[PIPE MANAGER] Skipping maroon cube generation - not a lower pipe container');
      return; // This is an upper pipe, skip
    }

    // Check if maroon cubes already exist for this pipe
    if ((pipeContainer as any).maroonHitboxes && (pipeContainer as any).maroonHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = PipeManager.numColumns;
    const hitboxWidth = PipeManager.hitboxWidth;
    
    console.log('[PIPE MANAGER] Generating maroon cubes for lower pipe');
    
    // Destroy the orange rectangle when maroon cubes spawn
    const orangeRect = pipeContainer.getByName('orangeRect') || pipeContainer.getAt(0);
    if (orangeRect) {
      orangeRect.destroy();
      console.log('[PIPE MANAGER] Destroyed orange rectangle for maroon cube generation');
    }
    
    // Create grid of maroon hitboxes for this lower pipe (fill entire container)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    const maroonColumns = numColumns; // Same as purple cubes (4 columns)
    const maroonRows = Math.floor(320 / hitboxWidth); // Fill the entire 320px height (20 rows)
    
    // Position maroon cubes to fill the entire lower pipe area
    const maroonStartX = 0; // Start at left edge, same as container
    const maroonStartY = 16; // Start right below the red rectangle
    
    for (let row = 0; row < maroonRows; row++) {
      for (let col = 0; col < maroonColumns; col++) {
        // Set container-relative position
        const exactX = maroonStartX + (col * hitboxWidth);
        const exactY = maroonStartY + (row * hitboxWidth);
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean; wasAttacked?: boolean }; // orange color
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

  placePipe(upPipe: any, lowPipe: any, enemyCreationCallback?: (greenHitbox: any) => void) {
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
      // Reset red hitbox (green hitbox) physics and effects when recycling
      if (redHitbox.body && redHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        redHitbox.body.setGravityY(0);
        redHitbox.body.setVelocityY(0);
        redHitbox.setAlpha(0.5); // Reset to original alpha
        this.scene.tweens.killTweensOf(redHitbox);
        redHitbox.body.reset(lowPipe.x, lowPipe.y);
      }
      redHitbox.angle = 0; // Reset rotation on recycle
    }
    if (upPipe && (upPipe as any).blueHitbox) {
      const blueHitbox = (upPipe as any).blueHitbox;
      blueHitbox.x = upPipe.x - 2;
      // Keep blue hitbox at bottom of purple column (don't reset Y position)
      const purpleColumnHeight = 23 * hitboxWidth; // 23 rows × 16px each
      const purpleColumnBottom = -288 + purpleColumnHeight; // Bottom of purple column
      blueHitbox.y = upPipe.y + purpleColumnBottom;
      if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        blueHitbox.body.setGravityY(0);
        blueHitbox.body.setVelocityY(0);
        blueHitbox.setAlpha(1);
        this.scene.tweens.killTweensOf(blueHitbox);
        blueHitbox.body.reset(upPipe.x - 2, upPipe.y + purpleColumnBottom);
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
      
      // If there are existing purple cubes, destroy them and recreate placeholder
      if (pipeHitboxes.length > 0) {
        pipeHitboxes.forEach((hitbox) => {
        this.scene.tweens.killTweensOf(hitbox);
          this.purpleHitboxes.remove(hitbox);
          hitbox.destroy();
        });
        // Reset to empty array
        (upPipe as any).purpleHitboxes = [];
        
                 // Destroy existing placeholder rectangle if it exists
         if ((upPipe as any).placeholderRect) {
           (upPipe as any).placeholderRect.destroy();
           (upPipe as any).placeholderRect = undefined;
         }
         
         // Recreate placeholder rectangle
         const blueWidth = numColumns * hitboxWidth;
         const purpleAreaWidth = blueWidth;
         const purpleAreaHeight = 23 * hitboxWidth; // 23 rows × 16px = 368px
         const purpleAreaX = -2; // Same X offset as purple cubes
         const purpleAreaY = -288; // Same Y as purple cube area
         const placeholderRect = this.scene.add.rectangle(purpleAreaX, purpleAreaY, purpleAreaWidth, purpleAreaHeight, 0xff8c00, 1);
         placeholderRect.setOrigin(0, 0);
         upPipe.add(placeholderRect);
         (upPipe as any).placeholderRect = placeholderRect;
      }
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
    // Clean up maroon cubes for lower pipes when recycling
    if (lowPipe && (lowPipe as any).maroonHitboxes) {
      const pipeHitboxes = (lowPipe as any).maroonHitboxes as Phaser.GameObjects.Rectangle[];
      
      // If there are existing maroon cubes, destroy them and reset
      if (pipeHitboxes.length > 0) {
        pipeHitboxes.forEach((hitbox) => {
          this.scene.tweens.killTweensOf(hitbox);
          this.maroonHitboxes.remove(hitbox);
          hitbox.destroy();
        });
        // Reset to empty array so look ahead detection can work again
        (lowPipe as any).maroonHitboxes = [];
        console.log('[PIPE MANAGER] Cleaned up maroon cubes for pipe recycling');
        
        // Recreate the orange rectangle for the lower pipe
        const numColumns = PipeManager.numColumns;
        const hitboxWidth = PipeManager.hitboxWidth;
        const blueWidth = numColumns * hitboxWidth;
        const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00);
        orangeRect.setOrigin(0, 0);
        orangeRect.setName('orangeRect');
        lowPipe.add(orangeRect);
        console.log('[PIPE MANAGER] Recreated orange rectangle for pipe recycling');
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
    // Removed: Maroon hitboxes now move with container
    // if (this.maroonHitboxes) {
    //   this.maroonHitboxes.setVelocityX(-200);
    // }

    // Create enemy on the lower pipe's green hitbox if callback is provided
    if (enemyCreationCallback && lowPipe && (lowPipe as any).redHitbox) {
      const greenHitbox = (lowPipe as any).redHitbox;
      enemyCreationCallback(greenHitbox);
    }
  }

  setCurrentDifficulty(currentDifficulty: string) {
    this.currentDifficulty = currentDifficulty;
  }

  // Create pipes at fixed positions (for chunk-based system)
  createPipesAtPosition(x: number, y: number, hasPurpleCubes: boolean = false, hasMaroonCubes: boolean = false): { upperPipe: any, lowerPipe: any } | null {
    const numColumns = PipeManager.numColumns;
    const hitboxWidth = PipeManager.hitboxWidth;
    const blueWidth = numColumns * hitboxWidth;
    
    console.log(`[PIPE MANAGER] Creating pipes at position (${x}, ${y})`);
    
    // Create upper pipe as a container with orange rectangle
    const upperPipeContainer = this.scene.add.container(x, y);
    // Add orange rectangle to container
    const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00, 0); // alpha 0
    upperOrangeRect.setOrigin(0, 1);
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
    // Calculate total height: orange rect goes from -320 to 0, purple cubes go to +80, blue hitbox to +96
    // Total span: from -320 to +96 = 416px total height
    const totalContainerHeight = 416;
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -320);
    this.pipes.add(upperPipeContainer as any);
    
    // Create lower pipe as a container with orange rectangle
    const lowerPipeContainer = this.scene.add.container(x, y);
    const orangeRect = this.scene.add.rectangle(0, 0, blueWidth, 320, 0xff8c00);
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
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, 320);
    (lowerPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, 16);
    // Create separate hitbox for red rectangle
    const redHitbox = this.scene.add.rectangle(x, y, blueWidth, 16, 0x00ff00, 0.5);
    redHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(redHitbox);
    (redHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.pipes.add(lowerPipeContainer as any);
    this.greenHitboxes.add(redHitbox);
    (lowerPipeContainer as any).redHitbox = redHitbox;
    (upperPipeContainer as any).blueHitbox = blueHitbox;
    (upperPipeContainer as any).blueRect = blueRect;
    (upperPipeContainer as any).purpleHitbox = this.purpleHitboxes;
    
    // Generate purple cubes if specified
    if (hasPurpleCubes) {
      this.generatePurpleCubesForPipe(upperPipeContainer);
    }
    
    // Generate maroon cubes if specified
    if (hasMaroonCubes) {
      this.generateMaroonCubesForPipe(lowerPipeContainer);
    }
    
    console.log(`[PIPE MANAGER] Successfully created pipes at (${x}, ${y})`);
    
    return { upperPipe: upperPipeContainer, lowerPipe: lowerPipeContainer };
  }

  getRightMostPipe(): number {
    let rightMostX = 0;
    this.pipes.getChildren().forEach(function (pipe: any) {
      const container = pipe as Phaser.GameObjects.Container;
      rightMostX = Math.max(container.x, rightMostX);
    });
    return rightMostX;
  }

  recyclePipes(scoreCallback: () => void, saveBestScoreCallback: () => void, increaseDifficultyCallback: () => void, kilboyX?: number, enemies?: any[], enemyCreationCallback?: (greenHitbox: any) => void) {
    const tempPipes: any[] = [];
    const recycledPipes: any[] = [];
    const recycleThreshold = kilboyX ? kilboyX - 200 : -1; // Recycle when pipe is 200px behind Kilboy
    
    this.pipes.getChildren().forEach((pipe: any) => {
      const container = pipe as Phaser.GameObjects.Container;
      // For containers, use x + width to determine right edge
      const pipeRight = container.x + (container.body ? (container.body as Phaser.Physics.Arcade.Body).width : 60);
      if (pipeRight <= recycleThreshold) {
        tempPipes.push(container);
        recycledPipes.push(container);
        if (tempPipes.length === 2) {
          this.placePipe(tempPipes[0], tempPipes[1], enemyCreationCallback);
          scoreCallback();
          saveBestScoreCallback();
          increaseDifficultyCallback();
        }
      }
    });

    // Recycle enemies associated with recycled pipes
    if (enemies && recycledPipes.length > 0) {
      this.recycleEnemiesForPipes(recycledPipes, enemies);
    }
  }

  // Method to recycle enemies associated with recycled pipes
  recycleEnemiesForPipes(recycledPipes: any[], enemies: any[]): void {
    recycledPipes.forEach(pipe => {
      // Find enemies that are associated with this pipe (lower pipe with green hitbox)
      if ((pipe as any).redHitbox) {
        // This is a lower pipe with a green hitbox - find enemies on this platform
        const pipeX = pipe.x;
        const pipeY = pipe.y;
        
        enemies.forEach((enemy, index) => {
          if (enemy && enemy.sprite && enemy.isAlive()) {
            // Check if enemy is on this pipe's platform
            const enemyX = enemy.sprite.x;
            const enemyY = enemy.sprite.y;
            
            // If enemy is close to this pipe's position, recycle it
            const distanceThreshold = 100; // Adjust as needed
            if (Math.abs(enemyX - pipeX) < distanceThreshold && Math.abs(enemyY - pipeY) < distanceThreshold) {
              console.log('[ENEMY RECYCLE] Recycling enemy associated with recycled pipe');
              enemy.sprite.destroy();
              enemies.splice(index, 1);
            }
          }
        });
      }
    });
  }

  // Stops all blue box (hitbox and rect) and red hitbox (green hitbox) animations
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
      if (pipe && pipe.redHitbox) {
        this.scene.tweens.killTweensOf(pipe.redHitbox);
        // Do not reset angle
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
            const numColumns = PipeManager.numColumns;
            const hitRow = Math.floor(hitIndex / numColumns);
            const hitCol = hitIndex % numColumns;
            console.log(`[MAROON FALL] Hit maroon cube at row ${hitRow}, col ${hitCol} - triggering fall for cubes above`);
            
                         pipeHitboxes.forEach((hitbox, index) => {
               const row = Math.floor(index / numColumns);
               const col = index % numColumns;
               // Trigger fall for cubes ABOVE the hit cube (row < hitRow) in the same column
               // Skip boxes that were attacked by the attack hitbox
               if (col === hitCol && row < hitRow && !(hitbox as any).wasAttacked) {
                 console.log(`[MAROON FALL] Making maroon cube at row ${row}, col ${col} fall`);
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
                         duration: PipeManager.MAROON_CUBE_FADE_DURATION,
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
               console.log('[MAROON FALL] Triggering green hitbox (red rectangle) fall for rightmost column hit');
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