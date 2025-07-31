import Phaser from "phaser";
import Player from "./Player";
import LowerPipeManager from "./LowerPipeManager";
import FloatingPipeManager from "./FloatingPipeManager";
import PipeCutHitStop from "../PipeCutHitStop";

export default class LedgeGrabManager {
  private scene: Phaser.Scene;
  private player: Player;
  private lowerPipeManager: LowerPipeManager;
  private floatingPipeManager: FloatingPipeManager;
  private pipeCutHitStop: PipeCutHitStop;
  private ledgeGrabOverlap?: any;
  private floatingLedgeGrabOverlap?: any;

  constructor(scene: Phaser.Scene, player: Player, lowerPipeManager: LowerPipeManager, floatingPipeManager: FloatingPipeManager, pipeCutHitStop: PipeCutHitStop) {
    this.scene = scene;
    this.player = player;
    this.lowerPipeManager = lowerPipeManager;
    this.floatingPipeManager = floatingPipeManager;
    this.pipeCutHitStop = pipeCutHitStop;
  }

  public setupLedgeGrabDetection(): void {
    // Set up overlap detection with LedgeGrab hitboxes
    if (!this.player.hitboxes.lookAheadHitbox) return;
    
    // Set up overlap detection for lower pipe ledge grab hitboxes
    this.ledgeGrabOverlap = this.scene.physics.add.overlap(
      this.player.hitboxes.lookAheadHitbox,
      this.lowerPipeManager.ledgeGrabHitboxes,
      (lookAhead: any, ledgeGrabHitbox: any) => {
        // Don't trigger ledge grab if Kilboy is already cutting through maroon hitboxes
        if (this.player.isHoldingSwingFrame) {
          return;
        }
        
        console.log("[LEDGE GRAB MANAGER] Lower pipe LedgeGrab detected ahead");
        // Find the pipe container that owns this LedgeGrab hitbox
        this.lowerPipeManager.pipes.getChildren().forEach((pipeContainer: any) => {
          if ((pipeContainer as any).ledgeGrabHitbox === ledgeGrabHitbox) {
            this.handleLedgeGrab(pipeContainer, 'lower');
          }
        });
      },
      undefined,
      this
    );

    // Set up overlap detection for floating pipe ledge grab hitboxes
    this.floatingLedgeGrabOverlap = this.scene.physics.add.overlap(
      this.player.hitboxes.lookAheadHitbox,
      this.floatingPipeManager.ledgeGrabHitboxes,
      (lookAhead: any, ledgeGrabHitbox: any) => {
        // Don't trigger ledge grab if Kilboy is already cutting through brown hitboxes
        if (this.player.isHoldingSwingFrame) {
          return;
        }
        
        console.log("[LEDGE GRAB MANAGER] Floating pipe LedgeGrab detected ahead");
        // Find the pipe container that owns this LedgeGrab hitbox
        this.floatingPipeManager.pipes.getChildren().forEach((pipeContainer: any) => {
          if ((pipeContainer as any).ledgeGrabHitbox === ledgeGrabHitbox) {
            // Mark this pipe as having used ledge grab (prevents green box from falling)
            this.floatingPipeManager.markLedgeGrabUsed(pipeContainer);
            this.handleLedgeGrab(pipeContainer, 'floating');
          }
        });
      },
      undefined,
      this
    );
  }

  private handleLedgeGrab(pipeContainer: any, pipeType: 'lower' | 'floating'): void {
    // Only trigger ledge grab if not already performing one
    if (this.player.isLedgeGrabbing) return;
    
    this.player.isLedgeGrabbing = true;
    
    // Trigger PipeCutHitStop with custom 50ms duration for quick feedback
    if (this.pipeCutHitStop) {
      this.pipeCutHitStop.trigger(50);
    }
    
    // Temporarily disable LedgeGrab detection to prevent detection loop
    if (this.ledgeGrabOverlap) {
      this.ledgeGrabOverlap.active = false;
    }
    
    // Get the green box position and dimensions based on pipe type
    let greenBox: any;
    if (pipeType === 'lower') {
      greenBox = (pipeContainer as any).redHitbox;
    } else if (pipeType === 'floating') {
      greenBox = (pipeContainer as any).greenHitbox;
    }
    if (!greenBox) return;
    
    // Calculate position next to the left side of the green box
    const ledgeX = greenBox.x - this.player.sprite.width; // Position Kilboy to the left of the green box
    const ledgeY = greenBox.y; // Same Y level as the green box
    
    // Update Kilboy's position
    this.player.sprite.setPosition(ledgeX, ledgeY);
    
    // Switch to ledge grab animation
    this.player.sprite.setTexture('kilboy_swing_ledgeGrab');
    
    // Move player 20px right and 20px up during ledge grab animation
    this.player.sprite.setPosition(ledgeX + 25, ledgeY - 30);
    
    // Pause for 50ms to match hitstop duration
    this.scene.time.delayedCall(150, () => {
      // Position player 20px right and 5px above the top of the green box
      const currentX = this.player.sprite.x; // Current position (ledgeX + 25)
      const currentY = this.player.sprite.y; // Current position (ledgeY - 30)
      const greenBoxTop = greenBox.y; // Top of the green box
      const finalX = currentX + 20; // 20px right from current position
      const finalY = greenBoxTop - 85; // 5px above the top of green box
      
      this.player.sprite.setPosition(finalX, finalY);
      
      // Set initial velocities
      if (this.player.sprite.body) {
        (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(600, 400);
      }
      
      // Gradually reduce X velocity from 600 to 250 over 1000ms
      this.scene.tweens.add({
        targets: this.player.sprite,
        x: this.player.sprite.x + 350, // Move 350px right over 1000ms
        duration: 1000,
        ease: 'Linear',
        onUpdate: () => {
          if (this.player.sprite.body) {
            const currentX = this.player.sprite.x;
            const startX = finalX;
            const progress = (currentX - startX) / 350; // 0 to 1
            const xVelocity = 600 - (progress * 350); // 600 to 250
            (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(xVelocity);
          }
        }
      });
      
      // Switch to run animation
      this.player.sprite.setTexture('kilboy');
      
      // Reset ledge grabbing flag
      this.player.isLedgeGrabbing = false;
      
      // Re-enable LedgeGrab detection after a short delay
      this.scene.time.delayedCall(100, () => {
        if (this.ledgeGrabOverlap) {
          this.ledgeGrabOverlap.active = true;
        }
      });
    });
  }

  public destroy(): void {
    if (this.ledgeGrabOverlap) {
      this.ledgeGrabOverlap.destroy();
      this.ledgeGrabOverlap = undefined;
    }
    if (this.floatingLedgeGrabOverlap) {
      this.floatingLedgeGrabOverlap.destroy();
      this.floatingLedgeGrabOverlap = undefined;
    }
  }
} 