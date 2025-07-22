import BaseScene from "./BaseScene";
import UIManager from "./UIManager";
import Player from "./Player";
import UpperPipeManager from "./UpperPipeManager";
import LowerPipeManager from "./LowerPipeManager";
import FloatingPipeManager from "./FloatingPipeManager";
import HitStop from "../HitStop";
import PipeCutHitStop from "../PipeCutHitStop";
import ChunkManager from "./ChunkManager";
import LedgeGrabManager from "./LedgeGrabManager";

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
const PLAYER_X_VELOCITY = 250; // Constant rightward velocity for chunk-based movement

class PlayScene extends BaseScene {
  private player!: Player;
  private upperPipeManager!: UpperPipeManager;
  private lowerPipeManager!: LowerPipeManager;
  private floatingPipeManager!: FloatingPipeManager;
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
  public pipeCutHitStop!: PipeCutHitStop;
  private debugYText!: Phaser.GameObjects.Text;
  private debugXText!: Phaser.GameObjects.Text;
  private debugXVelocityText!: Phaser.GameObjects.Text;
  private debugCameraText!: Phaser.GameObjects.Text;
  private groundPlaneSegments: Phaser.GameObjects.Rectangle[] = [];
  private skyPlaneSegments: Phaser.GameObjects.Rectangle[] = [];
  private chunkManager!: ChunkManager;
  private ledgeGrabManager!: LedgeGrabManager;
  
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
    this.pipeCutHitStop = new PipeCutHitStop(this); // Instantiate PipeCutHitStop for pipe cutting feedback
    
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
    // Register the player physics object for pipe cutting feedback
    this.pipeCutHitStop.register(this.player.sprite);
    
    // Setup camera to follow the player
    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setFollowOffset(-this.config.width / 2, 0); // Position Kilboy about 1/6th from left
    this.cameras.main.setLerp(0.1, 0.1); // Smooth camera movement
    this.cameras.main.setDeadzone(75, 40); // Larger dead zone for more movement freedom
    
    // Set camera bounds to allow full vertical movement
    // Sky plane is at Y=-1000, ground plane is at Y=1000
    // Camera should stop 50 pixels up from the bottom of the sky plane
    const cameraUpperBound = -900; // 50 pixels above sky plane bottom (-1000 + 50 = -1050)
    const cameraLowerBound = 1310 - (this.config.height / 2); // Ground Y + visible pixels - half screen height
    this.cameras.main.setBounds(0, cameraUpperBound, 1000000, cameraLowerBound - cameraUpperBound); // Full vertical range
    
    this.upperPipeManager = new UpperPipeManager(this, this.config, this.difficulties, this.currentDifficulty);
    this.lowerPipeManager = new LowerPipeManager(this, this.config, this.difficulties, this.currentDifficulty);
    this.floatingPipeManager = new FloatingPipeManager(this, this.config, this.difficulties, this.currentDifficulty, this.upperPipeManager, this.lowerPipeManager);
    
    // Initialize ChunkManager with pipe managers
    this.chunkManager = new ChunkManager(this, this.config, this.upperPipeManager, this.lowerPipeManager, this.floatingPipeManager);
    
    // Initialize LedgeGrabManager
    this.ledgeGrabManager = new LedgeGrabManager(this, this.player, this.lowerPipeManager, this.floatingPipeManager, this.pipeCutHitStop);
    
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
    this.upperPipeManager.recyclePipes(this.player.sprite.x, 1000);
    this.lowerPipeManager.recyclePipes(this.player.sprite.x, 1000);
    this.floatingPipeManager.recyclePipes(this.player.sprite.x, 1000);
    // Recycle chunks that are far behind the player
    this.chunkManager.recycleChunks(this.player.sprite.x, 1000);
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

      
          // Test chunk spawning (temporary)
    this.chunkManager.checkAndSpawnChunk(this.player.sprite.x);
    

    
    // Debug: Show when we're getting close to the test threshold
    if (this.player.sprite.x > 30 && this.player.sprite.x <= 50) {

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

      }
      if (!this.isGameOver && !this.player.isHoldingSwingFrameActive) {
        this.jumpCount = 0;
        this.updateJumpRectangles();
      } else if (this.player.isHoldingSwingFrameActive) {

      }
    }
    // Sync blueBottomHitbox to follow blueHitbox every frame
    this.upperPipeManager.blueHitboxes.getChildren().forEach((blueHitbox: any) => {
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
      ...this.upperPipeManager.purpleHitboxes.getChildren(),
      ...this.lowerPipeManager.maroonHitboxes.getChildren(),
      ...this.lowerPipeManager.fallingMaroonHitboxes.getChildren(),
      ...this.upperPipeManager.fallingPurpleHitboxes.getChildren(),
      ...this.floatingPipeManager.floatingPurpleHitboxes.getChildren(),
      ...this.floatingPipeManager.fallingPurpleHitboxes.getChildren()
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
    
    // Check purple hitboxes for X velocity and apply gravity/fading (but don't move to falling group yet)
    this.upperPipeManager.purpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = purpleHitbox.body as Phaser.Physics.Arcade.Body;
        
        // If purple hitbox has significant velocity, apply gravity and fading
        if (Math.abs(body.velocity.x) > 5) { // Higher threshold to avoid moving stationary hitboxes
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          
          // If Y velocity is zero, apply downward velocity to make it fall
          if (Math.abs(body.velocity.y) < 0.1) {
            body.setVelocityY(50); // Small downward velocity to start falling
          }
          
          // Start fading if not already fading
          if (purpleHitbox.alpha > 0) {
            this.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
                              duration: UpperPipeManager.PURPLE_CUBE_FADE_DURATION,
              ease: 'Linear',
            });
          }
        }
      }
    });
    
    // Check maroon hitboxes for X velocity and apply gravity/fading
    this.lowerPipeManager.maroonHitboxes.getChildren().forEach((maroonHitbox: any) => {
      if (maroonHitbox.body && maroonHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = maroonHitbox.body as Phaser.Physics.Arcade.Body;
        
        // If maroon hitbox has significant velocity, apply gravity and fading
        if (Math.abs(body.velocity.x) > 5) { // Higher threshold to avoid moving stationary hitboxes
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          
          // If Y velocity is zero, apply downward velocity to make it fall
          if (Math.abs(body.velocity.y) < 0.1) {
            body.setVelocityY(50); // Small downward velocity to start falling
          }
          
          // Start fading if not already fading
          if (maroonHitbox.alpha > 0) {
            this.tweens.add({
              targets: maroonHitbox,
              alpha: 0,
              duration: LowerPipeManager.MAROON_CUBE_FADE_DURATION,
              ease: 'Linear',
            });
          }
        }
      }
    });
    
    // Check falling maroon hitboxes for X velocity and apply gravity/fading
    this.lowerPipeManager.fallingMaroonHitboxes.getChildren().forEach((maroonHitbox: any) => {
      if (maroonHitbox.body && maroonHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = maroonHitbox.body as Phaser.Physics.Arcade.Body;
        
        // If maroon hitbox has significant velocity, apply gravity and fading
        if (Math.abs(body.velocity.x) > 5) { // Higher threshold to avoid moving stationary hitboxes
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          
          // If Y velocity is zero, apply downward velocity to make it fall
          if (Math.abs(body.velocity.y) < 0.1) {
            body.setVelocityY(50); // Small downward velocity to start falling
          }
          
          // Start fading if not already fading
          if (maroonHitbox.alpha > 0) {
            this.tweens.add({
              targets: maroonHitbox,
              alpha: 0,
              duration: LowerPipeManager.MAROON_CUBE_FADE_DURATION,
              ease: 'Linear',
            });
          }
        }
      }
    });
    
    // Check brown hitboxes for X velocity and apply gravity/fading
    this.floatingPipeManager.floatingPurpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = purpleHitbox.body as Phaser.Physics.Arcade.Body;
        
        // If brown hitbox has significant velocity, apply gravity and fading
        if (Math.abs(body.velocity.x) > 5) { // Higher threshold to avoid moving stationary hitboxes
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          
          // If Y velocity is zero, apply downward velocity to make it fall
          if (Math.abs(body.velocity.y) < 0.1) {
            body.setVelocityY(50); // Small downward velocity to start falling
          }
          
          // Start fading if not already fading
          if (purpleHitbox.alpha > 0) {
            this.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
              duration: 1000, // Same as triggerFallForHitboxesInColumn
              ease: 'Linear',
            });
          }
        }
      }
    });
    
    // Check falling brown hitboxes for X velocity and apply gravity/fading
    this.floatingPipeManager.fallingPurpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = purpleHitbox.body as Phaser.Physics.Arcade.Body;
        
        // If brown hitbox has significant velocity, apply gravity and fading
        if (Math.abs(body.velocity.x) > 5) { // Higher threshold to avoid moving stationary hitboxes
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          
          // If Y velocity is zero, apply downward velocity to make it fall
          if (Math.abs(body.velocity.y) < 0.1) {
            body.setVelocityY(50); // Small downward velocity to start falling
          }
          
          // Start fading if not already fading
          if (purpleHitbox.alpha > 0) {
            this.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
              duration: 1000, // Same as triggerFallForHitboxesInColumn
              ease: 'Linear',
            });
          }
        }
      }
    });
    
    // Update ground plane segments - recycle off-screen segments
    this.updateGroundSegments();
    
    // Update sky plane segments - recycle off-screen segments
    this.updateSkySegments();
    
    // Enemy system temporarily disabled for static pipe testing
    // Check floating pipe purple hitboxes for velocity and apply gravity/fading
    this.floatingPipeManager.floatingPurpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = purpleHitbox.body as Phaser.Physics.Arcade.Body;
        if (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5) {
          // Move to falling group if not already there
          this.floatingPipeManager.floatingPurpleHitboxes.remove(purpleHitbox);
          this.floatingPipeManager.fallingPurpleHitboxes.add(purpleHitbox);
          // Enable gravity if not already enabled
          if (!body.allowGravity) {
            body.setAllowGravity(true);
            body.setGravityY(800);
          }
          // Start fading if not already fading
          if (purpleHitbox.alpha > 0) {
            this.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
              duration: 1000,
              ease: 'Linear',
            });
          }
        }
      }
    });
    // Ensure gravity and fading for cubes already in falling group
    this.floatingPipeManager.fallingPurpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
        const body = purpleHitbox.body as Phaser.Physics.Arcade.Body;
        if (!body.allowGravity) {
          body.setAllowGravity(true);
          body.setGravityY(800);
        }
        if (purpleHitbox.alpha > 0) {
          this.tweens.add({
            targets: purpleHitbox,
            alpha: 0,
            duration: 1000,
            ease: 'Linear',
          });
        }
      }
    });
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
    // --- Fix: Destroy and clear old ground/sky segments, reset world bounds ---
    this.groundPlaneSegments.forEach(segment => segment.destroy());
    this.groundPlaneSegments = [];
    this.skyPlaneSegments.forEach(segment => segment.destroy());
    this.skyPlaneSegments = [];
    this.physics.world.setBounds(0, 0, this.config.width, this.config.height);
    // --- End fix ---

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
    // Ground plane segments are handled in createGroundSegment method
    // No need for separate collider here since each segment has its own collider
    // Upper hitbox overlaps with blue boxes (sensor-only detection)
    if (this.player && this.player.upperHitbox && this.upperPipeManager.blueHitboxes) {
      this.physics.add.overlap(
        this.player.upperHitbox,
        this.upperPipeManager.blueHitboxes,
        (obj1: any, obj2: any) => {
          // Handle blue box overlap with upper hitbox
          this.handleBlueBoxCollision(obj2);
        },
        undefined,
        this
      );
    }
    // Sprite collides with purple boxes (for damage)
    if (this.player && this.upperPipeManager.purpleHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.upperPipeManager.purpleHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handlePurpleHitboxCollision(obj2, this.upperPipeManager, this.isGameOver);
            // Check if Kilboy is in swing state (actively attacking)
            const isInAttackSwing = this.player.sprite.anims.isPlaying && this.player.sprite.anims.currentAnim?.key === "kilboy_swing_anim";
            // Prevent damage if player is in attack swing animation
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
    // Sprite collides with maroon boxes (for damage)
    if (this.player && this.lowerPipeManager.maroonHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.lowerPipeManager.maroonHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handleMaroonHitboxCollision(obj2, this.lowerPipeManager, this.isGameOver);
            // Check if Kilboy is in swing state (actively attacking)
            const isInAttackSwing = this.player.sprite.anims.isPlaying && this.player.sprite.anims.currentAnim?.key === "kilboy_swing_anim";
            // Prevent damage if player is in attack swing animation
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

    // Look ahead hitbox collision detection for UpperPipeManager pipes
    if (this.player && this.player.lookAheadHitbox) {
      
      // Set up overlap detection with purple cubes
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.upperPipeManager.purpleHitboxes,
        () => {
          // Cube detected ahead
          this.player.cubesDetectedAhead = true;
  
        },
        undefined,
        this
      );

      // Set up ledge grab detection
      this.ledgeGrabManager.setupLedgeGrabDetection();

      // Set up overlap detection with pipe containers to trigger cube generation
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.upperPipeManager.pipes,
        (lookAhead: any, pipeContainer: any) => {
          
          // Check if this is an upper pipe (has blueHitbox) or lower pipe (has redHitbox)
          // Floating pipes have both blueHitbox and greenHitbox, so we need to check for greenHitbox to exclude them
          if ((pipeContainer as any).blueHitbox && !(pipeContainer as any).greenHitbox) {
            // Generate purple cubes for upper pipe (but not floating pipes)
            this.upperPipeManager.generatePurpleCubesForPipe(pipeContainer);
          } else if ((pipeContainer as any).redHitbox) {
            // Generate maroon cubes for lower pipe
            this.lowerPipeManager.generateMaroonCubesForPipe(pipeContainer);
          } else if ((pipeContainer as any).blueHitbox && (pipeContainer as any).greenHitbox) {
            // Generate purple cubes for floating pipe
            this.floatingPipeManager.generatePurpleCubesForFloatingPipe(pipeContainer);
          }
        },
        undefined,
        this
      );
    }

    // Also check ChunkManager pipes for look-ahead detection
    if (this.player && this.player.lookAheadHitbox && this.chunkManager.pipes) {
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.chunkManager.pipes,
        (lookAhead: any, pipeContainer: any) => {
          
          // Check if this is an upper pipe (has blueHitbox) or lower pipe (has redHitbox)
          // Floating pipes have both blueHitbox and greenHitbox, so we need to check for greenHitbox to exclude them
          if ((pipeContainer as any).blueHitbox && !(pipeContainer as any).greenHitbox) {
            // Generate purple cubes for upper pipe (but not floating pipes)
            this.upperPipeManager.generatePurpleCubesForPipe(pipeContainer);
          } else if ((pipeContainer as any).redHitbox) {
            // Generate maroon cubes for lower pipe
            this.lowerPipeManager.generateMaroonCubesForPipe(pipeContainer);
          } else if ((pipeContainer as any).blueHitbox && (pipeContainer as any).greenHitbox) {
            // Generate purple cubes for floating pipe
            this.floatingPipeManager.generatePurpleCubesForFloatingPipe(pipeContainer);
          }
        },
        undefined,
        this
      );
    }

    // Set up overlap detection with floating pipe containers to trigger purple cube generation
    if (this.player && this.player.lookAheadHitbox && this.floatingPipeManager.pipes) {
      this.physics.add.overlap(
        this.player.lookAheadHitbox,
        this.floatingPipeManager.pipes,
        (lookAhead: any, pipeContainer: any) => {
          // Only generate purple cubes for floating pipes
          this.floatingPipeManager.generatePurpleCubesForFloatingPipe(pipeContainer);
        },
        undefined,
        this
      );
    }

    // Sprite collides with purple boxes (for damage) - floating pipe
    if (this.player && this.floatingPipeManager.floatingPurpleHitboxes) {
      this.physics.add.collider(
        this.player.sprite,
        this.floatingPipeManager.floatingPurpleHitboxes,
        (obj1: any, obj2: any) => {
          if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const shouldTakeDamage = this.player.handlePurpleHitboxCollision(obj2, this.floatingPipeManager, this.isGameOver);
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
    this.upperPipeManager.stopAllBlueBoxAnimations();
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
    if (!this.player || !this.player.sprite) return;
    let isOverlapping = false;
    let firstOverlappingGreen: any = null;
    
    // Check lower pipe green hitboxes
    if (this.lowerPipeManager.greenHitboxes) {
      this.lowerPipeManager.greenHitboxes.getChildren().forEach((hitbox: any) => {
        if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
          // Check if the green hitbox is falling (has gravity applied)
          const hitboxBody = hitbox.body as Phaser.Physics.Arcade.Body;
          const isFalling = hitboxBody && hitboxBody.gravity.y > 0;
          
          // Find the pipe container that owns this green hitbox
          let pipeHasMaroonCubes = false;
          let pipeContainer: any = null;
          this.lowerPipeManager.pipes.getChildren().forEach((container: any) => {
            if ((container as any).redHitbox === hitbox) {
              pipeContainer = container;
              // Check if maroon cubes have been spawned for this pipe
              if ((container as any).maroonHitboxes && (container as any).maroonHitboxes.length > 0) {
                pipeHasMaroonCubes = true;
              }
            }
          });
          
          if (!isFalling && !pipeHasMaroonCubes) {
            // Only allow standing on green hitbox if it's not falling AND no maroon cubes are spawned
            isOverlapping = true;
            if (!firstOverlappingGreen) firstOverlappingGreen = hitbox;
          } else if (pipeHasMaroonCubes && !isFalling) {
            // Trigger fall for green box when maroon cubes are spawned
            console.log("[PLAY SCENE] Triggering green box fall due to maroon cube spawn");
            if (pipeContainer && hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
              // Make the redHitbox movable so it can fall
              hitbox.body.setImmovable(false);
              hitbox.body.setAllowGravity(true);
              
              // Add a tiny upward velocity before falling
              hitbox.body.setVelocityY(-20);
              hitbox.body.setGravityY(800);
              
              // Apply gravity multiplier after initial upward movement
              this.time.delayedCall(100, () => {
                if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                  hitbox.body.setGravityY(800 * 3);
                }
              });
              
              this.tweens.add({
                targets: hitbox,
                alpha: 0,
                duration: 500,
                ease: 'Linear',
              });
              
              this.tweens.add({
                targets: hitbox,
                angle: -45, // Rotate in the opposite direction from blue hitbox
                duration: 500,
                ease: 'Linear',
              });
            }
          }
        }
      });
    }
    
    // Check floating pipe green hitboxes
    if (this.floatingPipeManager.greenHitboxes) {
      this.floatingPipeManager.greenHitboxes.getChildren().forEach((hitbox: any) => {
        if (this.player && this.player.sprite && this.physics.overlap(this.player.sprite, hitbox)) {
          // Check if the green hitbox is falling (has gravity applied)
          const hitboxBody = hitbox.body as Phaser.Physics.Arcade.Body;
          const isFalling = hitboxBody && hitboxBody.gravity.y > 0;
          
          // Find the pipe container that owns this green hitbox
          let pipeHasBrownCubes = false;
          let pipeContainer: any = null;
          this.floatingPipeManager.pipes.getChildren().forEach((container: any) => {
            if ((container as any).greenHitbox === hitbox) {
              pipeContainer = container;
              // Check if brown cubes have been spawned for this pipe
              if ((container as any).brownHitboxes && (container as any).brownHitboxes.length > 0) {
                pipeHasBrownCubes = true;
              }
            }
          });
          
          // Only allow standing on green hitbox if it's not falling AND no brown cubes are spawned
          if (!isFalling && !pipeHasBrownCubes) {
            isOverlapping = true;
            if (!firstOverlappingGreen) firstOverlappingGreen = hitbox;
          }
        }
      });
    }
    
    if (isOverlapping) {
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      // Only set texture if not holding swing frame
      if (!this.player.isHoldingSwingFrameActive) {
        this.player.sprite.setTexture("kilboy_run");
      } else {

      }
      // Set Kilboy's y position to a constant offset above the green box
      if (firstOverlappingGreen) {
        // Check if this is a floating pipe green hitbox (child of a container in floatingPipeManager.pipes)
        let isFloatingPipe = false;
        let floatingContainerY = 0;
        if (this.floatingPipeManager && this.floatingPipeManager.pipes) {
          this.floatingPipeManager.pipes.getChildren().forEach((container: any) => {
            if (container && container.list && container.list.includes(firstOverlappingGreen)) {
              isFloatingPipe = true;
              floatingContainerY = container.y;
            }
          });
        }
        if (isFloatingPipe) {
          this.player.sprite.y = floatingContainerY + firstOverlappingGreen.y - 64;
        } else {
          this.player.sprite.y = firstOverlappingGreen.y - 64;
        }
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
    if (!this.player || !this.player.upperHitbox) return;
    let isOverlapping = false;
    
    // Check upper pipe blue hitboxes
    if (this.upperPipeManager.blueHitboxes) {
      this.upperPipeManager.blueHitboxes.getChildren().forEach((hitbox: any) => {
        if (this.player && this.player.upperHitbox && this.physics.overlap(this.player.upperHitbox, hitbox)) {
          isOverlapping = true;
        }
      });
    }
    
    // Check floating pipe blue hitboxes
    if (this.floatingPipeManager.blueHitboxes) {
      this.floatingPipeManager.blueHitboxes.getChildren().forEach((hitbox: any) => {
        if (this.player && this.player.upperHitbox && this.physics.overlap(this.player.upperHitbox, hitbox)) {
          isOverlapping = true;
        }
      });
    }
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
      this.upperPipeManager.setCurrentDifficulty("normal");
      this.lowerPipeManager.setCurrentDifficulty("normal");
    }
    if (this.score === 3) {
      this.currentDifficulty = "hard";
      this.upperPipeManager.setCurrentDifficulty("hard");
      this.lowerPipeManager.setCurrentDifficulty("hard");
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