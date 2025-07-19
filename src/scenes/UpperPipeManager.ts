import Phaser from "phaser";

// Configuration interface for UpperPipeManager
export interface UpperPipeConfig {
  // Dimensions
  pipeWidth?: number;
  hitboxWidth?: number;
  blueHitboxHeight?: number;
  
  // Positioning
  containerYPosition?: number;
  basePipeHeight?: number;
  basePipeYPosition?: number;
  pipeHeightOffset?: number;
  
  // Animation
  purpleCubeFadeDuration?: number;
  
  // Colors
  colors?: {
    orange?: number;
    blue?: number;
    cyan?: number;
  };
  
  // Physics
  physics?: {
    gravity?: number;
    immovable?: boolean;
    pushable?: boolean;
  };
  
  // Offsets
  offsets?: {
    blueHitboxX?: number;
    placeholderX?: number;
    purpleCubeX?: number;
  };
}

export default class UpperPipeManager {
  private scene: Phaser.Scene;
  private config: any;
  private difficulties: any;
  private currentDifficulty: string;
  public pipes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
  public purpleHitboxes: Phaser.Physics.Arcade.Group;
  public fallingPurpleHitboxes: Phaser.Physics.Arcade.Group;
  
  // Default configuration that matches current hardcoded values
  private static readonly DEFAULT_CONFIG: UpperPipeConfig = {
    pipeWidth: Math.ceil(78 / 16) * 16,
    hitboxWidth: 16,
    blueHitboxHeight: 32,
    containerYPosition: -800,
    basePipeHeight: Math.ceil(800 / 16) * 16,
    basePipeYPosition: 0,
    pipeHeightOffset: 0, // No random offset for now
    purpleCubeFadeDuration: 1000,
    colors: {
      orange: 0xff8c00,
      blue: 0x0000ff,
      cyan: 0x00ffff
    },
    physics: {
      gravity: 400,
      immovable: true,
      pushable: false
    },
    offsets: {
      blueHitboxX: -2,
      placeholderX: -2,
      purpleCubeX: -2
    }
  };
  
  // Instance configuration (merged with defaults)
  private pipeConfig: UpperPipeConfig;
  
  // Cached calculated values to ensure consistency
  private cachedPipeHeight: number;
  private cachedPipeYPosition: number;

  // Add these constants for column logic (same as original PipeManager)
  private static readonly PIPE_WIDTH = Math.ceil(78 / 16) * 16; // Always a multiple of 16
  // Width of each hitbox (purple cube)
  private static readonly hitboxWidth = 16;
  // Dynamically calculated number of columns
  public static get numColumns() {
    return Math.floor(UpperPipeManager.PIPE_WIDTH / UpperPipeManager.hitboxWidth);
  }
  
  // Configurable fade duration for purple cubes (in milliseconds)
  public static readonly PURPLE_CUBE_FADE_DURATION = 1000;
  
  private static readonly BLUE_HITBOX_HEIGHT = 32; // Height of blue hitbox area
  
  // Configurable container position - controls where the pipe container is positioned
  public static readonly CONTAINER_Y_POSITION = -800; // Y position for pipe container (sky level)

  // Random offset for pipe height and position
  private static readonly BASE_PIPE_HEIGHT = Math.ceil(800 / 16) * 16;
  private static readonly PIPE_HEIGHT_OFFSET = Math.floor(Math.random() * 801) - 400; // -400 to 400
  public static readonly PIPE_HEIGHT = Math.ceil((UpperPipeManager.BASE_PIPE_HEIGHT + UpperPipeManager.PIPE_HEIGHT_OFFSET) / 16) * 16;
  private static readonly BASE_PIPE_Y_POSITION = 0;
  public static readonly PIPE_Y_POSITION = Math.ceil((UpperPipeManager.BASE_PIPE_Y_POSITION + UpperPipeManager.PIPE_HEIGHT_OFFSET) / 16) * 16;

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string, pipeConfig?: UpperPipeConfig) {
    this.scene = scene;
    this.config = config;
    this.difficulties = difficulties;
    this.currentDifficulty = currentDifficulty;
    
    // Merge provided config with defaults
    this.pipeConfig = { ...UpperPipeManager.DEFAULT_CONFIG, ...pipeConfig };
    
    // Use the original static values for now
    this.cachedPipeHeight = UpperPipeManager.PIPE_HEIGHT;
    this.cachedPipeYPosition = UpperPipeManager.PIPE_Y_POSITION;
    
    this.pipes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
    this.purpleHitboxes = this.scene.physics.add.group();
    this.fallingPurpleHitboxes = this.scene.physics.add.group();
  }

  // Create an upper pipe that extends to the sky plane
  createUpperPipe(x: number, y: number, overrideConfig?: Partial<UpperPipeConfig>): any {
    // Merge override config with instance config
    const config = { ...this.pipeConfig, ...overrideConfig };
    
    const blueWidth = this.pipeWidth;
    const pipeHeight = this.pipeHeight;
    const blueHitboxHeight = this.blueHitboxHeight;
    const colors = this.colors;
    const physics = this.physics;
    const offsets = this.offsets;
    

    
    // Create upper pipe as a container with orange rectangle - extend to sky plane
    const upperPipeContainer = this.scene.add.container(x, y);
    // Add orange rectangle to container - extend to sky plane
    const upperOrangeRect = this.scene.add.rectangle(0, 0, blueWidth, pipeHeight, colors.orange, 0); // alpha 0
    upperOrangeRect.setOrigin(0, 0); // Change to top-left origin so it extends downward
    upperOrangeRect.setPosition(0, -pipeHeight); // Position it to extend from pipe position down to sky
    upperPipeContainer.add(upperOrangeRect);
    // Add blue rectangle as child of the container
    const blueRect = this.scene.add.rectangle(0, 0, blueWidth, blueHitboxHeight, colors.blue, 0);
    blueRect.setOrigin(0, 0);
    blueRect.setPosition(0, 0); // Position at bottom of pipe area (pipe position)
    upperPipeContainer.add(blueRect);
    // Create separate hitbox for blue rectangle (positioned at pipe position)
    const blueHitbox = this.scene.add.rectangle(x + (offsets.blueHitboxX || 0), y, blueWidth, blueHitboxHeight, colors.cyan, 1);
    blueHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(blueHitbox);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(physics.immovable || true);
    (blueHitbox.body as Phaser.Physics.Arcade.Body).pushable = physics.pushable || false;
    this.blueHitboxes.add(blueHitbox);
    // Initialize empty purple hitboxes array (will be populated on-demand)
    (upperPipeContainer as any).purpleHitboxes = [];
    
    // Create placeholder orange rectangle covering the entire pipe height
    const placeholderWidth = blueWidth; // Same as pipe width
    const placeholderHeight = pipeHeight; // Full pipe height
    const placeholderX = offsets.placeholderX; // Same X offset as purple cubes
    const placeholderY = -pipeHeight; // Start from sky (top of pipe)
    const placeholderRect = this.scene.add.rectangle(placeholderX, placeholderY, placeholderWidth, placeholderHeight, colors.orange, 1);
    placeholderRect.setOrigin(0, 0);
    upperPipeContainer.add(placeholderRect);
    (upperPipeContainer as any).placeholderRect = placeholderRect;
    this.scene.physics.add.existing(upperPipeContainer);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(physics.immovable || true);
    // Calculate total height: pipe extends from sky to pipe position
    // Total span: from -PIPE_HEIGHT to +BLUE_HITBOX_HEIGHT
    const totalContainerHeight = pipeHeight + blueHitboxHeight; // pipe height + blue hitbox area
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(blueWidth, totalContainerHeight);
    (upperPipeContainer.body as Phaser.Physics.Arcade.Body).setOffset(0, -pipeHeight); // Offset to start from sky
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

    const numColumns = this.numColumns;
    const hitboxWidth = this.hitboxWidth;
    

    
    // Destroy the placeholder orange rectangle
    if ((pipeContainer as any).placeholderRect) {
      (pipeContainer as any).placeholderRect.destroy();
      (pipeContainer as any).placeholderRect = undefined;
    }
    
    // Calculate dynamic height for purple cubes based on unified pipe height
    const purpleCubeAreaHeight = this.pipeHeight; // Fill entire pipe height
    const numRows = Math.floor(purpleCubeAreaHeight / hitboxWidth);
    
    // Create grid of colored hitboxes for this pipe (numColumns across, dynamic rows)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position to match placeholder rectangle
        const exactX = (col * hitboxWidth) + (this.offsets.purpleCubeX || 0);
        const exactY = -this.pipeHeight + (row * hitboxWidth); // Start from sky (top of pipe)
        
        // Safety check: ensure purple cubes don't extend beyond pipe bounds
        if (exactY + hitboxWidth > 0) { // Stop at pipe position (bottom of pipe)
          console.warn(`[UPPER PIPE MANAGER] Skipping purple cube at row ${row} - would exceed pipe bounds (Y: ${exactY} > 0)`);
          continue;
        }
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, this.colors.orange, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // orange, fully opaque
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false); // Allow movement for gravity/velocity
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(true); // Enable gravity from creation
        (hitbox.body as Phaser.Physics.Arcade.Body).setGravityY(this.physics.gravity || 400);
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
            const numColumns = this.numColumns;
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
                  hitbox.body.setGravityY(this.physics.gravity || 400);
                }
                this.scene.tweens.add({
                  targets: hitbox,
                  alpha: 0,
                  duration: this.purpleCubeFadeDuration,
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

  // Stop all blue box animations
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
      
      // Remove associated hitboxes
      if ((pipe as any).blueHitbox) {
        this.blueHitboxes.remove((pipe as any).blueHitbox);
        (pipe as any).blueHitbox.destroy();
      }
      
      // Remove the pipe itself
      this.pipes.remove(pipe);
      pipe.destroy();
    });
    
    if (pipesToRemove.length > 0) {
      console.log(`[UPPER PIPE MANAGER] Recycled ${pipesToRemove.length} pipes`);
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
  
  // Helper methods to get configuration values
  private get pipeWidth(): number {
    return this.pipeConfig.pipeWidth || UpperPipeManager.DEFAULT_CONFIG.pipeWidth!;
  }
  
  private get hitboxWidth(): number {
    return this.pipeConfig.hitboxWidth || UpperPipeManager.DEFAULT_CONFIG.hitboxWidth!;
  }
  
  private get blueHitboxHeight(): number {
    return this.pipeConfig.blueHitboxHeight || UpperPipeManager.DEFAULT_CONFIG.blueHitboxHeight!;
  }
  
  private get purpleCubeFadeDuration(): number {
    return this.pipeConfig.purpleCubeFadeDuration || UpperPipeManager.DEFAULT_CONFIG.purpleCubeFadeDuration!;
  }
  
  private get colors() {
    return { ...UpperPipeManager.DEFAULT_CONFIG.colors!, ...this.pipeConfig.colors };
  }
  
  private get physics() {
    return { ...UpperPipeManager.DEFAULT_CONFIG.physics!, ...this.pipeConfig.physics };
  }
  
  private get offsets() {
    return { ...UpperPipeManager.DEFAULT_CONFIG.offsets!, ...this.pipeConfig.offsets };
  }
  
  // Calculate dynamic values based on configuration
  public get numColumns(): number {
    return Math.floor(this.pipeWidth / this.hitboxWidth);
  }
  
  public get pipeHeight(): number {
    return this.cachedPipeHeight;
  }
  
  public get pipeYPosition(): number {
    return this.cachedPipeYPosition;
  }
  
  // Static factory methods for common configurations
  static createFloatingPipeConfig(): UpperPipeConfig {
    return {
      pipeWidth: 80,
      blueHitboxHeight: 32,
      basePipeHeight: 400,
      pipeHeightOffset: 0,
      colors: {
        orange: 0xff8c00,
        blue: 0x0000ff,
        cyan: 0x00ffff
      }
    };
  }
  
  static createStandardPipeConfig(): UpperPipeConfig {
    return UpperPipeManager.DEFAULT_CONFIG;
  }
  
  static createCustomPipeConfig(overrides: Partial<UpperPipeConfig>): UpperPipeConfig {
    return { ...UpperPipeManager.DEFAULT_CONFIG, ...overrides };
  }
} 