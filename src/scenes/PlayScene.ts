import BaseScene from "./BaseScene";
import UIManager from "./UIManager";
import Player from "./Player";
import StaticPipeManager from "./StaticPipeManager";
import HitStop from "../HitStop";
import ChunkManager from "./ChunkManager";

const PIPES_TO_RENDER = 4;

interface Difficulty {
  pipeHorizontalDistanceRange: [number, number];
  pipeVerticalDistanceRange: [number, number];
}

interface Difficulties {
  easy: Difficulty;
  normal: Difficulty;
  hard: Difficulty;
}

const FALL_GRAVITY_MULTIPLIER = 2.5;
const PLAYER_X_VELOCITY = 200; // Constant rightward velocity for chunk-based movement

class PlayScene extends BaseScene {
  private player!: Player;
  private pipeManager!: StaticPipeManager;
  private isTouchingBlueHitbox: boolean = false;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private flapVELOCITY: number = 270;
  private initialFlapVelocity: number = 800;
  private decelerationRate: number = 0.8;
  private frameCount: number = 0;
  private score: number = 0;
  private jumpCount: number = 0;
  private currentDifficulty: keyof Difficulties = "easy";
  private difficulties: Difficulties = {
    easy: {
      pipeHorizontalDistanceRange: [300, 350],
      pipeVerticalDistanceRange: [150, 200],
    },
    normal: {
      pipeHorizontalDistanceRange: [280, 330],
      pipeVerticalDistanceRange: [140, 190],
    },
    hard: {
      pipeHorizontalDistanceRange: [250, 310],
      pipeVerticalDistanceRange: [120, 150],
    },
  };
  private pauseEvent?: Phaser.Events.EventEmitter;
  private initialTime?: number;
  private countDownText?: Phaser.GameObjects.Text;
  private timedEvent?: Phaser.Time.TimerEvent;
  private uiManager!: UIManager;
  public hitStop!: HitStop;
  private debugYText!: Phaser.GameObjects.Text;
  private debugXText!: Phaser.GameObjects.Text;
  private debugXVelocityText!: Phaser.GameObjects.Text;
  private debugCameraText!: Phaser.GameObjects.Text;
  private groundPlaneSegments: Phaser.GameObjects.Rectangle[] = [];
  private skyPlaneSegments: Phaser.GameObjects.Rectangle[] = [];
  private chunkManager!: ChunkManager;
  
  // Make PLAYER_X_VELOCITY accessible to other classes
  public readonly PLAYER_X_VELOCITY = PLAYER_X_VELOCITY;

  constructor(config: any) {
    super("PlayScene", { ...config, canGoBack: true });
  }

  create(): void {
    super.create();
    this.isGameOver = false;
    this.currentDifficulty = "easy";
    this.hitStop = new HitStop(this); // Instantiate HitStop
    
    // Create background first
    this.createBG();
    
    this.player = new Player(this, this.config.startPosition);
    
    // Add constant rightward velocity to player (for chunk-based system)
    if (this.player.sprite.body) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(PLAYER_X_VELOCITY); // Constant rightward movement
    }
    
    // Create ground plane at Y position 1000 (after player is created)
    this.createGroundPlane();
    // Register the player physics object for hitstop
    this.hitStop.register(this.player.sprite);
    
    // Setup camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setFollowOffset(-this.config.width / 3, 0); // Position Kilboy about 1/6th from left
    this.cameras.main.setLerp(0.1, 0.1); // Smooth camera movement
    this.cameras.main.setDeadzone(75, 40); // Larger dead zone for more movement freedom
    
    // Set camera bounds to allow full vertical movement
    // Sky plane is at Y=-1000, ground plane is at Y=1000
    // Camera should be able to follow Kilboy anywhere between these bounds
    const cameraUpperBound = -1200 - (this.config.height / 2); // Sky Y - sky height - half screen height
    const cameraLowerBound = 1310 - (this.config.height / 2); // Ground Y + visible pixels - half screen height
    this.cameras.main.setBounds(0, cameraUpperBound, 1000000, cameraLowerBound - cameraUpperBound); // Full vertical range
    
    this.pipeManager = new StaticPipeManager(this, this.config, this.difficulties, this.currentDifficulty);
    // Create initial static pipes for testing
    this.pipeManager.createPipePair(600, 400, 200);
    this.pipeManager.createPipePair(800, 350, 180);
    this.pipeManager.createPipePair(1000, 450, 220);
    
    // Create ground pipes that come up from the ground plane
    this.pipeManager.createGroundPipe(1200, 150); // Short ground pipe
    this.pipeManager.createGroundPipe(1400, 250); // Medium ground pipe
    this.pipeManager.createGroundPipe(1600, 350); // Tall ground pipe
    
    // Initialize ChunkManager (for future use)
    this.chunkManager = new ChunkManager(this, this.config);
    
    this.createEnemies();
    this.createColiders();
    this.uiManager = new UIManager(this);
    const bestScore = localStorage.getItem("bestScore");
    this.uiManager.createScoreUI(0, bestScore ? parseInt(bestScore, 10) : 0);
    this.uiManager.createJumpRectangles();
    this.uiManager.createHealthUI(3);
    this.createPause();
    this.createDebugUI();
    this.handleInputs();
    this.listenToEvents();
  }

  update(): void {
    // Sync upper hitbox first, before any movement
    this.player.syncUpperHitbox();
    this.player.preUpdate(); // (now does nothing, but kept for structure)
    this.checkGameStatus();
    // Recycle static pipes that are far behind the player
    this.pipeManager.recyclePipes(this.player.sprite.x, 1000);
    this.checkGreenHitboxOverlap();
    this.checkBlueHitboxOverlap();
    this.uiManager.updateHealthUI(this.player.getHealth());
    this.player.updateAttackHitboxPosition();
    
    // Update debug Y position
    if (this.debugYText && this.player && this.player.sprite) {
      this.debugYText.setText(`Y: ${Math.round(this.player.sprite.y)}`);
    }
    
    // Update debug X position
    if (this.debugXText && this.player && this.player.sprite) {
      this.debugXText.setText(`X: ${Math.round(this.player.sprite.x)}`);
    }
    
    // Update debug X velocity
    if (this.debugXVelocityText && this.player && this.player.sprite && this.player.sprite.body) {
      const xVelocity = Math.round((this.player.sprite.body as Phaser.Physics.Arcade.Body).velocity.x);
      this.debugXVelocityText.setText(`X Vel: ${xVelocity}`);
    }
    
    // Update debug camera coordinates
    if (this.debugCameraText) {
      const cameraX = Math.round(this.cameras.main.scrollX);
      const cameraY = Math.round(this.cameras.main.scrollY);
      this.debugCameraText.setText(`Cam: ${cameraX}, ${cameraY}`);
    }
    
    // Test ChunkManager (temporary debug)
    if (this.player && this.player.sprite) {
      const chunkInfo = this.chunkManager.getChunkInfo(this.player.sprite.x);
      const templateInfo = this.chunkManager.getChunkTemplateInfo(chunkInfo.currentIndex);
      console.log(`[CHUNK DEBUG] Player X: ${Math.round(this.player.sprite.x)}, Chunk: ${chunkInfo.currentIndex}, Chunk X: ${chunkInfo.chunkX}, Template: ${templateInfo?.templateId || 'none'}, Difficulty: ${templateInfo?.difficulty || 0}`);
      
          // Test chunk spawning (temporary)
    this.chunkManager.checkAndSpawnChunk(this.player.sprite.x);
    
    // Test static pipe creation (temporary - only once)
    if (this.player.sprite.x > 50 && !(this as any).staticPipesTested) {
      console.log('[TEST] Creating additional static pipes');
      this.pipeManager.createPipePair(1200, 380, 190);
      this.pipeManager.createPipePair(1400, 420, 210);
      (this as any).staticPipesTested = true;
    }
    
    // Debug: Show when we're getting close to the test threshold
    if (this.player.sprite.x > 30 && this.player.sprite.x <= 50) {
      console.log(`[TEST DEBUG] Player X: ${Math.round(this.player.sprite.x)}, approaching static pipe test threshold`);
    }
    }
    if (this.isGameOver) {
      this.stopAllAnimationsOnDeath();
      return;
    }
    if (this.player && this.player.sprite.body && this.player.sprite.body.velocity.y < 0) {
      this.frameCount++;
      if (this.frameCount % 2 === 0) {
        this.player.sprite.body.velocity.y *= this.decelerationRate;
      }
    } else {
      this.frameCount = 0;
    }
    if (this.player && this.player.sprite.body && this.player.sprite.body.velocity.y > 0) {
      if (!this.player.isInvincible && !this.player.isHoldingSwingFrameActive) {
        this.player.sprite.setTexture("kilboy");
      } else if (this.player.isHoldingSwingFrameActive) {
        // Debug: PlayScene tried to override but swing frame is active
        console.log('[PLAYSCE] Preserving swing texture - isHoldingSwingFrameActive:', this.player.isHoldingSwingFrameActive);
      }
      if (!this.isGameOver && !this.player.isHoldingSwingFrameActive) {
        this.jumpCount = 0;
        this.updateJumpRectangles();
      } else if (this.player.isHoldingSwingFrameActive) {
        console.log('[PLAYSCE] Preventing jumpCount reset during swing frame hold');
      }
    }
    // Sync blueBottomHitbox to follow blueHitbox every frame
    this.pipeManager.blueHitboxes.getChildren().forEach((blueHitbox: any) => {
      if (blueHitbox.blueBottomHitbox) {
        blueHitbox.blueBottomHitbox.x = blueHitbox.x + blueHitbox.width / 2;
        // blueHitbox.blueBottomHitbox.y = blueHitbox.y + blueHitbox.height + 60; // Keep y fixed
        if (blueHitbox.blueBottomHitbox.body) {
          blueHitbox.blueBottomHitbox.body.velocity.x = blueHitbox.body.velocity.x;
          blueHitbox.blueBottomHitbox.body.velocity.y = blueHitbox.body.velocity.y;
        }
      }
    });

    // --- Gravity Multiplier System ---
    // List of all objects to apply gravity multiplier to
    const gravityObjects = [
      this.player.sprite,
      ...this.pipeManager.purpleHitboxes.getChildren(),
      ...this.pipeManager.maroonHitboxes.getChildren(),
      ...this.pipeManager.fallingMaroonHitboxes.getChildren()
    ];
    gravityObjects.forEach(obj => {
      if (obj.body && obj.body instanceof Phaser.Physics.Arcade.Body) {
        const body = obj.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y > 0) {
          if (body.gravity.y <= 400) {
            body.gravity.y = 400 * FALL_GRAVITY_MULTIPLIER;
          }
        } else if (body.velocity.y < 0) {
          if (body.gravity.y > 400) {
            body.gravity.y = 400;
          }
        }
      }
    });
    // --- End Gravity Multiplier System ---
    
    // Update ground plane segments - recycle off-screen segments
    this.updateGroundSegments();
    
    // Update sky plane segments - recycle off-screen segments
    this.updateSkySegments();
    
    // Enemy system temporarily disabled for static pipe testing
  }

  private updateGroundSegments(): void {
    if (!this.player || !this.player.sprite) return;
    
    const playerX = this.player.sprite.x;
    const screenLeft = playerX - this.config.width / 2;
    const screenRight = playerX + this.config.width / 2;
    const segmentWidth = 200;
    
    // Remove segments that are too far to the left (off-screen)
    this.groundPlaneSegments = this.groundPlaneSegments.filter(segment => {
      const segmentRight = segment.x + segmentWidth;
      if (segmentRight < screenLeft - 100) { // 100px buffer
        // Destroy the segment
        if (segment.body && segment.body instanceof Phaser.Physics.Arcade.Body) {
          segment.body.destroy();
        }
        segment.destroy();
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // Add new segments to the right if needed
    const rightmostSegment = this.groundPlaneSegments.length > 0 
      ? Math.max(...this.groundPlaneSegments.map(s => s.x))
      : screenRight;
    
    if (rightmostSegment < screenRight + 200) { // 200px buffer
      const newSegmentX = rightmostSegment + segmentWidth;
      this.createGroundSegment(newSegmentX, 1000, segmentWidth, 200);
    }
  }

  private updateSkySegments(): void {
    if (!this.player || !this.player.sprite) return;
    
    const playerX = this.player.sprite.x;
    const screenLeft = playerX - this.config.width / 2;
    const screenRight = playerX + this.config.width / 2;
    const segmentWidth = 200;
    
    // Remove segments that are too far to the left (off-screen)
    this.skyPlaneSegments = this.skyPlaneSegments.filter(segment => {
      const segmentRight = segment.x + segmentWidth;
      if (segmentRight < screenLeft - 100) { // 100px buffer
        // Destroy the segment
        if (segment.body && segment.body instanceof Phaser.Physics.Arcade.Body) {
          segment.body.destroy();
        }
        segment.destroy();
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // Add new segments to the right if needed
    const rightmostSegment = this.skyPlaneSegments.length > 0 
      ? Math.max(...this.skyPlaneSegments.map(s => s.x))
      : screenRight;
    
    if (rightmostSegment < screenRight + 200) { // 200px buffer
      const newSegmentX = rightmostSegment + segmentWidth;
      this.createSkySegment(newSegmentX, -1000, segmentWidth, 200);
    }
  }

  private listenToEvents(): void {
    if (this.pauseEvent) {
      return;
    }
    this.pauseEvent = this.events.on("resume", () => {
      this.initialTime = 3;
      this.countDownText = this.add
        .text(
          ...this.screenCenter,
          "Fly in: " + this.initialTime,
          this.fontOptions
        )
        .setOrigin(0.5);
      this.timedEvent = this.time.addEvent({
        delay: 1000,
        callback: this.countDown,
        callbackScope: this,
        loop: true,
      });
    });
  }

  private countDown(): void {
    if (this.initialTime !== undefined) {
      this.initialTime--;
      this.countDownText?.setText("Fly in: " + this.initialTime);
      if (this.initialTime !== undefined && this.initialTime <= 0) {
        this.isPaused = false;
        this.countDownText?.setText("");
        this.physics.resume();
        if (this.timedEvent) {
          this.timedEvent.remove();
        }
      }
    }
  }

  private createBG(): void {
    const bg = this.add.image(0, 0, "sky-bg").setOrigin(0);
    bg.setScrollFactor(0); // This makes the background fixed to the camera
  }

  private createGroundPlane(): void {
    // Create segmented ground plane system
    this.createInitialGroundSegments();
    
    // Create segmented sky plane system
    this.createInitialSkySegments();
    
    // Update world bounds to include both planes
    // The ground plane is at Y=1000, sky plane at Y=-1000
    const groundHeight = 200;
    const skyHeight = 200;
    const worldHeight = 1000 + groundHeight; // Ground Y + ground height
    const worldTop = -1000 - skyHeight; // Sky Y - sky height
    this.physics.world.setBounds(15, worldTop, this.config.width - 15, worldHeight - worldTop);
  }

  private createInitialGroundSegments(): void {
    // Create initial ground segments to cover the starting area
    const segmentWidth = 200; // Smaller segments for better memory management
    const groundHeight = 200;
    const groundY = 1000;
    
    // Create segments starting from left edge of world
    const startX = -200; // Start before screen
    const endX = this.config.width + 400; // Extend beyond screen
    
    for (let x = startX; x < endX; x += segmentWidth) {
      this.createGroundSegment(x, groundY, segmentWidth, groundHeight);
    }
  }

  private createInitialSkySegments(): void {
    // Create initial sky segments to cover the starting area
    const segmentWidth = 200; // Smaller segments for better memory management
    const skyHeight = 200;
    const skyY = -1000;
    
    // Create segments starting from left edge of world
    const startX = -200; // Start before screen
    const endX = this.config.width + 400; // Extend beyond screen
    
    for (let x = startX; x < endX; x += segmentWidth) {
      this.createSkySegment(x, skyY, segmentWidth, skyHeight);
    }
  }

  private createGroundSegment(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    const groundSegment = this.add.rectangle(x, y, width, height, 0xFF8C00, 1); // Orange color
    groundSegment.setOrigin(0, 0);
    
    // Add physics to the ground segment
    this.physics.add.existing(groundSegment);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Add collider with player
    this.physics.add.collider(
      this.player.sprite,
      groundSegment,
      () => {
        // Player hit the ground - stop Y movement but preserve X velocity
        if (this.player && this.player.sprite && this.player.sprite.body) {
          const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
          // Only stop Y velocity, preserve X velocity for chunk-based movement
          body.setVelocityY(0);
          // Switch to run texture when touching ground
          this.player.sprite.setTexture("kilboy_run");
        }
      },
      undefined,
      this
    );
    
    this.groundPlaneSegments.push(groundSegment);
    return groundSegment;
  }

  private createSkySegment(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    const skySegment = this.add.rectangle(x, y, width, height, 0x87CEEB, 1); // Sky blue color
    skySegment.setOrigin(0, 0);
    
    // Add physics to the sky segment
    this.physics.add.existing(skySegment);
    (skySegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (skySegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Add collider with player
    this.physics.add.collider(
      this.player.sprite,
      skySegment,
      () => {
        // Player hit the sky - stop Y movement but preserve X velocity
        if (this.player && this.player.sprite && this.player.sprite.body) {
          const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
          // Only stop Y velocity, preserve X velocity for chunk-based movement
          body.setVelocityY(0);
          // Switch to fall texture when hitting sky
          this.player.sprite.setTexture("kilboy");
        }
      },
      undefined,
      this
    );
    
    this.skyPlaneSegments.push(skySegment);
    return skySegment;
  }

  private createAdditionalGroundSegment(x: number): void {
    // Create additional ground plane segment at specified X position
    const groundHeight = 200;
    const groundWidth = this.config.width + 100; // Extra padding
    
    const groundSegment = this.add.rectangle(x, 1000, groundWidth, groundHeight, 0x8B4513, 1);
    groundSegment.setOrigin(0, 0);
    
    // Add physics to the ground segment
    this.physics.add.existing(groundSegment);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (groundSegment.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Add collider with player
    this.physics.add.collider(
      this.player.sprite,
      groundSegment,
      () => {
        // Player hit the ground - stop Y movement but preserve X velocity
        if (this.player && this.player.sprite && this.player.sprite.body) {
          const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
          // Only stop Y velocity, preserve X velocity for chunk-based movement
          body.setVelocityY(0);
          // Switch to run texture when touching ground
          this.player.sprite.setTexture("kilboy_run");
        }
      },
      undefined,
      this
    );
    
    this.groundPlaneSegments.push(groundSegment);
  }

  private createEnemies(): void {
    // Enemy system temporarily disabled for static pipe testing
  }

  private createEnemyForGreenHitbox(greenHitbox: any): void {
    // Enemy system temporarily disabled for static pipe testing
  }

  private createColiders(): void {
    if (this.player && this.pipeManager.pipes) {
      // Optionally add pipe collision logic here
    }
    
    // Ground plane segments are handled in createGroundSegment method
    // No need for separate collider here since each segment has its own collider
    // Upper hitbox overlaps with blue boxes (sensor-only detection)
    if (this.player && this.player.upperHitbox && this.pipeManager.blueHitboxes) {
      this.physics.add.overlap(
        this.player.upperHitbox,
        this.pipeManager.blueHitboxes,
        (obj1: any, obj2: any) => {
          // Handle blue box overlap with upper hitbox
          this.handleBlueBoxCollision(obj2);
        },
        undefined,
        this
      );
    }
    // Sprite collides with purple boxes
    if (this.player && this.pipeManager.purpleHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.pipeManager.purpleHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handlePurpleHitboxCollision(obj2, this.pipeManager, this.isGameOver);
            // Prevent damage if player is in attack swing animation
            const isInAttackSwing = this.player.sprite.anims.isPlaying && this.player.sprite.anims.currentAnim?.key === "kilboy_swing_anim";
            if (shouldTakeDamage && !this.player.isInvincible && !isInAttackSwing) {
              if (this.player.takeHit()) {
                this.gameOver();
              }
              this.uiManager.updateHealthUI(this.player.getHealth());
            }
          }
        },
        undefined,
        this
      );
    }
    // Sprite collides with maroon boxes
    if (this.player && this.pipeManager.maroonHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.pipeManager.maroonHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handleMaroonHitboxCollision(obj2, this.pipeManager, this.isGameOver);
            // Prevent damage if player is in attack swing animation
            const isInAttackSwing = this.player.sprite.anims.isPlaying && this.player.sprite.anims.currentAnim?.key === "kilboy_swing_anim";
            if (shouldTakeDamage && !this.player.isInvincible && !isInAttackSwing) {
              if (this.player.takeHit()) {
                this.gameOver();
              }
              this.uiManager.updateHealthUI(this.player.getHealth());
            }
          }
        },
        undefined,
        this
      );
    }

    // Look ahead hitbox collision detection
    if (this.player && this.player.lookAheadHitbox && this.pipeManager.pipes) {
      // Set up overlap detection with purple cubes
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.pipeManager.purpleHitboxes,
        () => {
          // Cube detected ahead
          this.player.cubesDetectedAhead = true;
          console.log('[LOOK-AHEAD] Purple cube detected ahead');
        },
        undefined,
        this
      );

      // Set up overlap detection with pipe containers to trigger purple cube generation
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.pipeManager.pipes,
        (lookAhead: any, pipeContainer: any) => {
          // Check if this is an upper pipe (has blueHitbox) or lower pipe (has redHitbox)
          if ((pipeContainer as any).blueHitbox) {
            // Generate purple cubes for upper pipe
            this.pipeManager.generatePurpleCubesForPipe(pipeContainer);
            console.log('[LOOK-AHEAD] Triggered purple cube generation for upper pipe');
          } else if ((pipeContainer as any).redHitbox) {
            // Generate maroon cubes for lower pipe
            this.pipeManager.generateMaroonCubesForPipe(pipeContainer);
            console.log('[LOOK-AHEAD] Triggered maroon cube generation for lower pipe');
          }
        },
        undefined,
        this
      );
    }
  }

  private handleBlueBoxCollision(blueHitbox: any): void {
    // Handle blue box collision logic here
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(25);
      // Reset gravity to normal when hitting blue box
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      if (this.player) {
        this.player.canFlap = false;
        this.time.delayedCall(45, () => {
          this.player.canFlap = true;
        });
        // Destroy attack hitboxes if they exist
        if (this.player["hitStopCheck"]) {
          this.player["hitStopCheck"].destroy();
          this.player["hitStopCheck"] = undefined;
        }
        if (this.player["attackHitbox"]) {
          this.player["attackHitbox"].destroy();
          this.player["attackHitbox"] = undefined;
        }
      }
    }
  }

  private createScore(): void {
    // No longer needed, handled by UIManager
  }

  private createPause(): void {
    this.isPaused = false;
    const pauseButton = this.add
      .image(this.config.width - 60, this.config.height - 10, "pause")
      .setOrigin(1)
      .setInteractive()
      .setScale(2.8)
      .setDepth(10); // Ensure pause button is on top of all game objects
    
    pauseButton.setScrollFactor(0); // Fix to camera

    pauseButton.on("pointerdown", () => {
      this.isPaused = true;
      this.physics.pause();
      this.scene.pause();
      this.scene.launch("PauseScene");
    });
  }

  private createDebugUI(): void {
    // Create debug text in top-left corner
    this.debugYText = this.add
      .text(10, 10, "Y: 0", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0) // Fix to camera
      .setDepth(20); // Ensure it's on top
    
    // Create X position debug text below Y position
    this.debugXText = this.add
      .text(10, 30, "X: 0", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0) // Fix to camera
      .setDepth(20); // Ensure it's on top
    
    // Create X velocity debug text below X position
    this.debugXVelocityText = this.add
      .text(10, 50, "X Vel: 0", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0) // Fix to camera
      .setDepth(20); // Ensure it's on top
    
    // Create camera coordinates debug text below X velocity
    this.debugCameraText = this.add
      .text(10, 70, "Cam: 0, 0", {
        fontSize: "16px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0) // Fix to camera
      .setDepth(20); // Ensure it's on top
  }

  private handleInputs(): void {
    this.input.on("pointerdown", this.flap, this);
    this.input.keyboard?.on("keydown-SPACE", this.flap, this);
  }

  private checkGameStatus(): void {
    // Y movement limits removed - Kilboy can now move freely in Y direction
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.physics.pause();
    if (this.player && this.player.sprite) {
      this.player.sprite.setTint(0xff0000);
    }

    // Stop all animations when player dies
    this.stopAllAnimationsOnDeath();

    this.saveBestScore();

    this.time.addEvent({
      delay: 500,
      callback: () => {
        this.scene.restart();
      },
      loop: false,
    });
  }

  private stopAllAnimationsOnDeath(): void {
    this.uiManager.updateJumpRectanglesAtDeath();
    this.pipeManager.stopAllBlueBoxAnimations();
  }

  private stopGravity(): void {
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
    }
  }

  private restoreGravity(): void {
    if (this.player && this.player.sprite) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
    }
  }

  private checkGreenHitboxOverlap(): void {
    if (!this.player || !this.player.sprite || !this.pipeManager.greenHitboxes) return;
    let isOverlapping = false;
    let firstOverlappingGreen: any = null;
    this.pipeManager.greenHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
        // Check if the green hitbox is falling (has gravity applied)
        const hitboxBody = hitbox.body as Phaser.Physics.Arcade.Body;
        const isFalling = hitboxBody && hitboxBody.gravity.y > 0;
        
        if (!isFalling) {
          // Only allow standing on green hitbox if it's not falling
          isOverlapping = true;
          if (!firstOverlappingGreen) firstOverlappingGreen = hitbox;
        }
      }
    });
    if (isOverlapping) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      // Only set texture if not holding swing frame
      if (!this.player.isHoldingSwingFrameActive) {
        this.player.sprite.setTexture("kilboy_run");
      } else {
        console.log('[PLAYSCE] Green hitbox contact - preserving swing texture during frame hold');
      }
      // Set Kilboy's y position to a constant offset above the green box
      if (firstOverlappingGreen) {
        this.player.sprite.y = firstOverlappingGreen.y - 48; // Tweak this offset as needed
      }
    } else {
      // Only reset gravity if the player's gravity multiplier system hasn't applied enhanced gravity
      const currentGravity = (this.player.sprite.body as Phaser.Physics.Arcade.Body).gravity.y;
      if (currentGravity <= 400) {
        (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      }
    }
  }

  private checkBlueHitboxOverlap(): void {
    if (!this.player || !this.player.upperHitbox || !this.pipeManager.blueHitboxes) return;
    let isOverlapping = false;
    this.pipeManager.blueHitboxes.getChildren().forEach((hitbox) => {
      if (this.player && this.player.upperHitbox && this.physics.overlap(this.player.upperHitbox, hitbox)) {
        isOverlapping = true;
      }
    });
    if (isOverlapping && !this.isTouchingBlueHitbox) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(25);
      // Reset gravity to normal when hitting blue box
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      if (this.player) {
        this.player.canFlap = false;
        this.time.delayedCall(45, () => {
          this.player.canFlap = true;
        });
        // Destroy attack hitboxes if they exist
        if (this.player["hitStopCheck"]) {
          this.player["hitStopCheck"].destroy();
          this.player["hitStopCheck"] = undefined;
        }
        if (this.player["attackHitbox"]) {
          this.player["attackHitbox"].destroy();
          this.player["attackHitbox"] = undefined;
        }
      }
      this.isTouchingBlueHitbox = true;
    } else if (!isOverlapping && this.isTouchingBlueHitbox) {
      this.isTouchingBlueHitbox = false;
    }
  }

  private flap(): void {
    if (this.isGameOver || this.isPaused || !this.player || this.jumpCount >= 3) {
      return;
    }
    if (this.player.flap(this.initialFlapVelocity)) {
      this.jumpCount++;
      this.updateJumpRectangles();
    }
  }

  private updateJumpRectangles(): void {
    if (this.isGameOver) return;
    this.uiManager.updateJumpRectangles(this.jumpCount);
  }

  private increaseScore(): void {
    this.score++;
    this.uiManager.updateScore(this.score);
  }

  private saveBestScore(): void {
    const bestScoreText = localStorage.getItem("bestScore");
    const bestScore = bestScoreText && parseInt(bestScoreText, 10);
    if (!bestScore || this.score > bestScore) {
      localStorage.setItem("bestScore", this.score.toString());
    }
  }

  private increaseDifficulty(): void {
    if (this.score === 1) {
      this.currentDifficulty = "normal";
      this.pipeManager.setCurrentDifficulty("normal");
    }
    if (this.score === 3) {
      this.currentDifficulty = "hard";
      this.pipeManager.setCurrentDifficulty("hard");
    }
  }

  private handleCollision(): void {
    if (!this.player.isInvincible) {
      if (this.player.takeHit()) {
        this.gameOver();
      }
      this.uiManager.updateHealthUI(this.player.getHealth());
    }
  }


}

export default PlayScene; 