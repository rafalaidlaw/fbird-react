import Phaser from "phaser";

export default class FloatingPipeManager {
  private scene: Phaser.Scene;
  public pipes: Phaser.Physics.Arcade.Group;
  public greenHitboxes: Phaser.Physics.Arcade.Group;
  public blueHitboxes: Phaser.Physics.Arcade.Group;
<<<<<<< HEAD
  // Add a group for floating pipe purple cubes
  public floatingPurpleHitboxes: Phaser.Physics.Arcade.Group;
  public ledgeGrabHitboxes: Phaser.Physics.Arcade.Group;
  public fallingPurpleHitboxes: Phaser.Physics.Arcade.Group;
=======
  public brownHitboxes: Phaser.Physics.Arcade.Group;
  public fallingBrownHitboxes: Phaser.Physics.Arcade.Group;
  public ledgeGrabHitboxes: Phaser.Physics.Arcade.Group;
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f

  constructor(scene: Phaser.Scene, config: any, difficulties: any, currentDifficulty: string, upperPipeManager: any, lowerPipeManager: any) {
    this.scene = scene;
    this.pipes = this.scene.physics.add.group();
    this.greenHitboxes = this.scene.physics.add.group();
    this.blueHitboxes = this.scene.physics.add.group();
<<<<<<< HEAD
    this.floatingPurpleHitboxes = this.scene.physics.add.group();
    this.ledgeGrabHitboxes = this.scene.physics.add.group();
    this.fallingPurpleHitboxes = this.scene.physics.add.group();
=======
    this.brownHitboxes = this.scene.physics.add.group();
    this.fallingBrownHitboxes = this.scene.physics.add.group();
    this.ledgeGrabHitboxes = this.scene.physics.add.group();
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
  }

  // Create a floating pipe at the specified position
  createFloatingPipe(x: number, y: number): any {
    // Create main floating pipe container
    const floatingPipeContainer = this.scene.add.container(x, y);
    
<<<<<<< HEAD
    // Add placeholder orange rectangle as the first child (for visual consistency with upper pipe)
    const placeholderRect = this.scene.add.rectangle(0, 0, 80, 192, 0xff8c00, 1);
    placeholderRect.setOrigin(0, 0);
    placeholderRect.setName('placeholderRect');
    floatingPipeContainer.addAt(placeholderRect, 0);
    (floatingPipeContainer as any).placeholderRect = placeholderRect;

    // Create green walkable platform on top (serves as both visual and physics)
=======
    // Add invisible orange rectangle covering the entire pipe area (like upper pipe)
    const orangeRect = this.scene.add.rectangle(0, 0, 80, 200, 0xff8c00, 0); // alpha 0, invisible
    orangeRect.setOrigin(0, 0);
    floatingPipeContainer.add(orangeRect);
    
    // Create green walkable platform on top
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
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
    
<<<<<<< HEAD
    // Remove creation of separate visual blue ceiling
    // Create blue hitbox at the bottom (serves as both visual and physics)
=======
    // Create blue ceiling at the bottom
    const blueCeiling = this.scene.add.rectangle(
      40, 
      184, // Position at bottom of container (200 - 16)
      80, 
      32, 
      0x00ffff // Same cyan color as upper pipe blue hitbox
    );
    blueCeiling.setName('blueCeiling'); // Give it a name for easy identification
    floatingPipeContainer.add(blueCeiling);
    
    // Create orange placeholder rectangle covering the brown cube area
    const placeholderWidth = 80; // Same as pipe width
    const placeholderHeight = 136; // Available height for brown cubes (200 - 32 - 32)
    const placeholderX = 0; // Start at left edge of container
    const placeholderY = 32; // Start below green platform (matches brown cube positioning)
    const placeholderRect = this.scene.add.rectangle(placeholderX, placeholderY, placeholderWidth, placeholderHeight, 0xff8c00, 1); // Orange color
    placeholderRect.setOrigin(0, 0);
    placeholderRect.setName('orangeRect'); // Give it a name for easy identification
    floatingPipeContainer.add(placeholderRect);
    (floatingPipeContainer as any).placeholderRect = placeholderRect;
    
    // Create separate physics body for blue ceiling detection
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
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
    
<<<<<<< HEAD
=======
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
    
    // Create pink LedgeGrab hitbox at the left edge of the green platform
    const ledgeGrabHitbox = this.scene.add.rectangle(
      x -10, // Same X as green platform
      y + 16, // Same Y as green platform
      8, // Width of ledge grab hitbox
      16, // Height of ledge grab hitbox
      0xff69b4, // Pink color
      0.7 // Semi-transparent
    );
    ledgeGrabHitbox.setOrigin(0, 0);
    ledgeGrabHitbox.setName('LedgeGrab');
    this.scene.physics.add.existing(ledgeGrabHitbox);
    (ledgeGrabHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.ledgeGrabHitboxes.add(ledgeGrabHitbox);
    (floatingPipeContainer as any).ledgeGrabHitbox = ledgeGrabHitbox;
    
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
    // Set up physics for the container
    this.scene.physics.add.existing(floatingPipeContainer);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (floatingPipeContainer.body as Phaser.Physics.Arcade.Body).setSize(80, 192);
    
    this.pipes.add(floatingPipeContainer as any);
    
    // Initialize empty brown hitboxes array (will be populated on-demand)
    (floatingPipeContainer as any).brownHitboxes = [];
    
    // Initialize ledge grab flag (false = ledge grab not used yet)
    (floatingPipeContainer as any).ledgeGrabUsed = false;
    
    return floatingPipeContainer;
  }

<<<<<<< HEAD
  // Generate purple cubes for the floating pipe (between green and blue platforms)
  public generatePurpleCubesForFloatingPipe(floatingPipeContainer: any): void {
    // Check if purple cubes already exist for this pipe
    if ((floatingPipeContainer as any).purpleHitboxes && (floatingPipeContainer as any).purpleHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = 5; // Match brown cube columns
    const hitboxWidth = 16;
    const pipeWidth = 80;
    const pipeHeight = 192;
=======
  // Generate brown cubes for the floating pipe
  public generateBrownCubesForPipe(pipeContainer: any): void {
    // Check if brown cubes already exist for this pipe
    if ((pipeContainer as any).brownHitboxes && (pipeContainer as any).brownHitboxes.length > 0) {
      return; // Already generated, skip
    }

    const numColumns = 5; // 5 columns (80px width / 16px = 5)
    const hitboxWidth = 16;
    const pipeWidth = 80;
    const pipeHeight = 200;
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
    const greenPlatformHeight = 32;
    const blueCeilingHeight = 32;
    const availableHeight = pipeHeight - greenPlatformHeight - blueCeilingHeight; // 200 - 32 - 32 = 136
    const numRows = Math.floor(availableHeight / hitboxWidth); // 136 / 16 = 8 rows
<<<<<<< HEAD

    // Optionally destroy placeholder rectangle if present
    if ((floatingPipeContainer as any).placeholderRect) {
      (floatingPipeContainer as any).placeholderRect.destroy();
      (floatingPipeContainer as any).placeholderRect = undefined;
    }

    // Create grid of purple hitboxes for this floating pipe (5 columns across, 8 rows)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
=======
    
    // Destroy the orange placeholder rectangle
    if ((pipeContainer as any).placeholderRect) {
      (pipeContainer as any).placeholderRect.destroy();
      (pipeContainer as any).placeholderRect = undefined;
    }
    
    // Create grid of brown hitboxes for this pipe (5 columns across, 8 rows)
    const pipeHitboxes: Phaser.GameObjects.Rectangle[] = [];
    
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numColumns; col++) {
        // Set container-relative position
        const exactX = (col * hitboxWidth);
        const exactY = greenPlatformHeight + (row * hitboxWidth); // Start below green platform
<<<<<<< HEAD

        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0xff8c00, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean };
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);

=======
        
        const hitbox = this.scene.add.rectangle(0, 0, hitboxWidth, hitboxWidth, 0x8B4513, 1) as Phaser.GameObjects.Rectangle & { canDamage?: boolean }; // brown, fully opaque
        hitbox.setOrigin(0, 0);
        hitbox.setPosition(exactX, exactY);
        
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
        this.scene.physics.add.existing(hitbox);
        (hitbox.body as Phaser.Physics.Arcade.Body).setImmovable(false); // Allow movement for gravity/velocity
        (hitbox.body as Phaser.Physics.Arcade.Body).setSize(hitboxWidth, hitboxWidth);
        (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(true); // Enable gravity from creation
        (hitbox.body as Phaser.Physics.Arcade.Body).setGravityY(400);
        hitbox.canDamage = true;
<<<<<<< HEAD
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
          const pipeHitboxes = (floatingPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
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
=======
        pipeContainer.add(hitbox); // Add to container first
        this.brownHitboxes.add(hitbox); // Then add to global group
        pipeHitboxes.push(hitbox);
      }
    }
    (pipeContainer as any).brownHitboxes = pipeHitboxes;

    // Destroy the ledge grab hitbox since brown cubes have been spawned
    if ((pipeContainer as any).ledgeGrabHitbox) {
      console.log("[FLOATING PIPE MANAGER] Destroying ledge grab hitbox due to brown cube spawn");
      this.ledgeGrabHitboxes.remove((pipeContainer as any).ledgeGrabHitbox);
      (pipeContainer as any).ledgeGrabHitbox.destroy();
      (pipeContainer as any).ledgeGrabHitbox = null;
    }
  }

  /**
   * Makes all brown hitboxes in the same column fall and fade out when a hitbox is cut.
   * @param hitHitbox The hit brown hitbox (Phaser.GameObjects.Rectangle)
   * @param isGameOver Whether the game is over
   */
  public triggerFallForHitboxesInColumn(hitHitbox: Phaser.GameObjects.Rectangle, isGameOver: boolean): void {
    this.scene.time.delayedCall(50, () => {
      this.pipes.getChildren().forEach((pipe: any) => {
        const floatingPipe = pipe as Phaser.GameObjects.Container;
        if (floatingPipe && (floatingPipe as any).brownHitboxes) {
          const pipeHitboxes = (floatingPipe as any).brownHitboxes as Phaser.GameObjects.Rectangle[];
          const hitIndex = pipeHitboxes.indexOf(hitHitbox);
          if (hitIndex !== -1) {
            const numColumns = 5;
            const hitCol = hitIndex % numColumns;
            
            // Disable damage for all brown cubes in this pipe to prevent player damage
            pipeHitboxes.forEach((hitbox) => {
              (hitbox as any).canDamage = false;
            });
            
            // Disable green hitbox collision if any brown cube starts fading
            if (floatingPipe && (floatingPipe as any).greenHitbox) {
              const greenHitbox = (floatingPipe as any).greenHitbox;
              this.greenHitboxes.remove(greenHitbox);
            }
            
            // Trigger fall for all cubes in the same column
            pipeHitboxes.forEach((hitbox, index) => {
              const col = index % numColumns;
              if (col === hitCol) {
                // Move to falling group to prevent collision with player
                this.brownHitboxes.remove(hitbox);
                this.fallingBrownHitboxes.add(hitbox);
                
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
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
<<<<<<< HEAD
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
=======
            
            // Check if any cube in the first column has been hit (including the current hit cube)
            const firstColumnHit = hitCol === 0;
            
            // Debug logging
            console.log(`[FLOATING PIPE MANAGER] COLUMN FALL CHECK - hitCol: ${hitCol}, firstColumnHit: ${firstColumnHit}`);
            
            // Trigger fall for the green hitbox associated with this pipe when the first column is hit
            // But only if ledge grab hasn't been used on this pipe
            if (firstColumnHit && floatingPipe && (floatingPipe as any).greenHitbox && !(floatingPipe as any).ledgeGrabUsed) {
              console.log(`[FLOATING PIPE MANAGER] TRIGGERING GREEN BOX FALL WITH COLUMN!`);
              const greenHitbox = (floatingPipe as any).greenHitbox;
          
              if (greenHitbox.body && greenHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                // Disable collision by removing from greenHitboxes group
                this.greenHitboxes.remove(greenHitbox);
                
                // Make the greenHitbox movable so it can fall
                greenHitbox.body.setImmovable(false);
                greenHitbox.body.setAllowGravity(true);
                
                // Add a tiny upward velocity before falling
                greenHitbox.body.setVelocityY(-20);
                greenHitbox.body.setGravityY(800);
                
                // Apply gravity multiplier after initial upward movement
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
                this.scene.time.delayedCall(100, () => {
                  if (greenHitbox.body && greenHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                    greenHitbox.body.setGravityY(800 * 3);
                  }
                });
<<<<<<< HEAD
=======
                
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
                this.scene.tweens.add({
                  targets: greenHitbox,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                });
<<<<<<< HEAD
                this.scene.tweens.add({
                  targets: greenHitbox,
                  angle: -45,
                  duration: 500,
                  ease: 'Linear',
                });
=======
                if (!isGameOver) {
                  this.scene.tweens.add({
                    targets: greenHitbox,
                    angle: -45, // Rotate in the opposite direction from blue hitbox
                    duration: 500,
                    ease: 'Linear',
                  });
                }
              }
              
              // Also make the visual green platform fall
              const visualGreenPlatform = floatingPipe.getAt(0) as Phaser.GameObjects.Rectangle; // First child is the green platform
              if (visualGreenPlatform) {
                // Remove from container so it can move independently
                floatingPipe.remove(visualGreenPlatform);
                
                // Set absolute world position
                const worldX = floatingPipe.x + visualGreenPlatform.x;
                const worldY = floatingPipe.y + visualGreenPlatform.y;
                visualGreenPlatform.setPosition(worldX, worldY);
                
                // Add physics to the visual platform
                this.scene.physics.add.existing(visualGreenPlatform);
                (visualGreenPlatform.body as Phaser.Physics.Arcade.Body).setImmovable(false);
                (visualGreenPlatform.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
                (visualGreenPlatform.body as Phaser.Physics.Arcade.Body).setVelocityY(-20);
                (visualGreenPlatform.body as Phaser.Physics.Arcade.Body).setGravityY(800);
                
                // Apply gravity multiplier after initial upward movement
                this.scene.time.delayedCall(100, () => {
                  if (visualGreenPlatform.body && visualGreenPlatform.body instanceof Phaser.Physics.Arcade.Body) {
                    visualGreenPlatform.body.setGravityY(800 * 3);
                  }
                });
                
                this.scene.tweens.add({
                  targets: visualGreenPlatform,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                });
                if (!isGameOver) {
                  this.scene.tweens.add({
                    targets: visualGreenPlatform,
                    angle: -45,
                    duration: 500,
                    ease: 'Linear',
                  });
                }
              }
            }
            
            // Trigger fall for the blue hitbox associated with this pipe when the last column (col 4) is hit
            if (hitCol === 4 && floatingPipe && (floatingPipe as any).blueHitbox) {
              const blueHitbox = (floatingPipe as any).blueHitbox;
              if (blueHitbox.body && blueHitbox.body instanceof Phaser.Physics.Arcade.Body) {
                // Just fade out the physics hitbox (no gravity/falling)
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
              
              // Also make the visual blue ceiling fall
              console.log(`[FLOATING PIPE MANAGER] Looking for visual blue ceiling, container has ${floatingPipe.length} children`);
              const visualBlueCeiling = floatingPipe.getByName('blueCeiling') as Phaser.GameObjects.Rectangle;
              if (visualBlueCeiling) {
                console.log(`[FLOATING PIPE MANAGER] Found visual blue ceiling by name, removing from container`);
                // Remove from container so it can move independently
                floatingPipe.remove(visualBlueCeiling);
                
                // Set absolute world position
                const worldX = floatingPipe.x + visualBlueCeiling.x;
                const worldY = floatingPipe.y + visualBlueCeiling.y;
                visualBlueCeiling.setPosition(worldX, worldY);
                
                // Add physics to the visual ceiling
                this.scene.physics.add.existing(visualBlueCeiling);
                (visualBlueCeiling.body as Phaser.Physics.Arcade.Body).setImmovable(false);
                (visualBlueCeiling.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
                (visualBlueCeiling.body as Phaser.Physics.Arcade.Body).setGravityY(400);
                
                this.scene.tweens.add({
                  targets: visualBlueCeiling,
                  alpha: 0,
                  duration: 500,
                  ease: 'Linear',
                });
                if (!isGameOver) {
                  this.scene.tweens.add({
                    targets: visualBlueCeiling,
                    angle: -45,
                    duration: 500,
                    ease: 'Linear',
                  });
                }
>>>>>>> 9436357343bc6552e1b302a71b612c7d3880964f
              }
            }
          }
        }
      });
    });
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
      
      // Remove associated ledge grab hitbox
      if ((pipe as any).ledgeGrabHitbox) {
        this.ledgeGrabHitboxes.remove((pipe as any).ledgeGrabHitbox);
        (pipe as any).ledgeGrabHitbox.destroy();
      }
      
      // Remove associated brown hitboxes
      if ((pipe as any).brownHitboxes) {
        (pipe as any).brownHitboxes.forEach((hitbox: any) => {
          this.brownHitboxes.remove(hitbox);
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
