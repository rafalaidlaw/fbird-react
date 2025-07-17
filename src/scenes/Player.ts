import Phaser from "phaser";
import PipeManager from "./PipeManager";

export default class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private invincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;
  private health: number = 4;
  private invincibleTimeout?: Phaser.Time.TimerEvent;
  private hitStopCheck?: Phaser.GameObjects.Arc;
  private hitStopCheckTimer?: Phaser.Time.TimerEvent;
  private attackHitbox?: Phaser.GameObjects.Arc;
  public lookAheadHitbox?: Phaser.GameObjects.Rectangle;
  public canFlap: boolean = true;
  // Add separate hitboxes for upper and lower body
  public upperHitbox?: Phaser.GameObjects.Rectangle;
  public lowerHitbox?: Phaser.GameObjects.Rectangle;
  
  // Attack hitbox configuration - easily adjustable
  private static readonly ATTACK_RADIUS = 44; // Radius of the attack hitbox (10% bigger)
  private static readonly ATTACK_OFFSET_X = 45; // How far to the right of Kilboy
  private static readonly ATTACK_OFFSET_Y = -10; // Vertical offset from Kilboy's center
  
  // Hitstop hitbox configuration
  private static readonly HITSTOP_RADIUS = 26; // Radius of the hitstop check hitbox (smaller than attack)
  private static readonly HITSTOP_OFFSET_X = 40; // How far to the right of Kilboy (5px left of attack)
  private static readonly HITSTOP_OFFSET_Y = -13; // Vertical offset from Kilboy's center (3px up from attack)

  private hitstopTriggeredThisSwing: boolean = false;
  private hitstopTriggered: boolean = false;
  private animationUpdateHandler?: Function;
  private isDashing: boolean = false;
  private dashTween?: Phaser.Tweens.Tween;
  private hitstopCooldownActive: boolean = false;
  private lastPurpleCubeHitTime: number = 0;
  private isHoldingSwingFrame: boolean = false;
  private swingFrameCheckTimer?: Phaser.Time.TimerEvent;
  public cubesDetectedAhead: boolean = false;
  
  constructor(scene: Phaser.Scene, startPosition: { x: number, y: number }) {
    this.scene = scene;
    this.sprite = this.scene.physics.add
      .sprite(startPosition.x, startPosition.y, "kilboy")
      .setOrigin(0)
      .setDepth(1);
    // Create swing animation (non-looping, holds on last frame) - only if it doesn't exist
    if (!this.scene.anims.exists("kilboy_swing_anim")) {
    this.scene.anims.create({
      key: "kilboy_swing_anim",
      frames: [
        { key: "kilboy_swing_anim1" },
        { key: "kilboy_swing_anim2" },
        { key: "kilboy_swing_anim3" },
      ],
      frameRate: 12,
      repeat: 0,
      showOnStart: true,
      hideOnComplete: false,
    });
    }
    
    // Listen for the animation frame event to trigger hitstop
    // this.sprite.on('animationupdate', (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
    //   if (anim.key === 'kilboy_swing_anim' && frame.textureFrame === 'kilboy_swing_anim2.png') {
    //     (this.scene as any).hitStop?.trigger(200);
    //   }
    // });

    // Create two separate hitboxes instead of one
    const hitboxWidth = this.sprite.width * 0.5;
    const hitboxHeight = (this.sprite.height + 2) / 2; // Split height in half
    
    // Set sprite body size and offset to match lower hitbox (main collision)
    this.sprite.setBodySize(hitboxWidth, hitboxHeight, false);
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setOffset(6, hitboxHeight); // Offset to lower half
      (this.sprite.body as Phaser.Physics.Arcade.Body).gravity.y = 400;
      (this.sprite.body as Phaser.Physics.Arcade.Body).setBounce(0, 1);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setDragX(0);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setMaxVelocity(2000, 800);
      (this.sprite.body as Phaser.Physics.Arcade.Body).pushable = false;
    }
    // this.sprite.setCollideWorldBounds(true);
    // World bounds are now set in PlayScene to include the ground plane

    // Upper hitbox for blue box collisions (sensor only)
    this.upperHitbox = this.scene.add.rectangle(this.sprite.x, this.sprite.y, hitboxWidth, hitboxHeight, 0x0000ff, 0.3);
    this.scene.physics.add.existing(this.upperHitbox);
    if (this.upperHitbox.body) {
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).moves = false;
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).setAcceleration(0, 0);
      (this.upperHitbox.body as Phaser.Physics.Arcade.Body).setDrag(0, 0);
    }
    this.upperHitbox.setAlpha(0); // Invisible for production

    // Lower hitbox is not needed for collision, only for reference if you want
    this.lowerHitbox = undefined;

    // Create permanent look ahead hitbox (always active)
    this.createLookAheadHitbox();
  }

  flap(initialFlapVelocity: number): boolean {
    if (!this.canFlap) return false;
    if (this.invincible) return false;
    if (this.isDashing) return false;
    // Reset hitstopTriggered if jumpCount is 0
    if ((this.scene as any).jumpCount !== undefined && (this.scene as any).jumpCount === 0) {
      this.hitstopTriggered = false;
      // Reset hitstop cooldown when starting a new jump sequence
      this.hitstopCooldownActive = false;
    }
    
    // Handle swing frame holding state
    if (this.isHoldingSwingFrame) {
      // Use manual detection to check if cubes are ahead
      const cubesAhead = this.detectCubesAhead();
      if (cubesAhead) {
        // Check if jumps are still available
        const currentJumpCount = (this.scene as any).jumpCount || 0;
        if (currentJumpCount < 3) {
          // Jumps available - allow jump but maintain swing state

          if (this.sprite.body) {
            (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y = -initialFlapVelocity;
          }
          // Restart swing animation from frame 1
          this.sprite.anims.play("kilboy_swing_anim", true);

          return true; // Allow jump without cleaning up swing state
        } else {
          // No jumps available - block flap

          return false;
        }
      }

      this.isHoldingSwingFrame = false;
      if (this.swingFrameCheckTimer) {
        this.swingFrameCheckTimer.remove();
        this.swingFrameCheckTimer = undefined;
      }
      // Clean up extended attackHitbox from previous swing hold
      if (this.attackHitbox) {
        if ((this.scene as any).hitStop) {
          (this.scene as any).hitStop.unregister(this.attackHitbox);
        }
        this.attackHitbox.destroy();
        this.attackHitbox = undefined;
        console.log('[HITSTOP DEBUG] Attack hitbox destroyed');
      }
      // Look ahead hitbox is now permanent - no need to clean up
    }
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y = -initialFlapVelocity;
    }
    // Play swing animation (non-looping, holds on last frame)
    console.log('[HITSTOP DEBUG] Entering attack swing state');
    this.sprite.anims.play("kilboy_swing_anim", true);

    // Reset hitstop flag for this swing
    this.hitstopTriggeredThisSwing = false;

    // Listen for animation frame update to destroy the first hitbox after the first frame
    if (this.animationUpdateHandler) {
      this.sprite.off('animationupdate', this.animationUpdateHandler as any);
    }
    this.animationUpdateHandler = (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (anim.key === 'kilboy_swing_anim' && frame.index > 1) {
        // After the first frame, destroy the hitStopCheck hitbox if it exists
        if (this.hitStopCheck) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.hitStopCheck);
          }
          this.hitStopCheck.destroy();
          this.hitStopCheck = undefined;
        }
        // If hitstop was NOT triggered, create the attack hitbox immediately
        if (!this.hitstopTriggeredThisSwing) {
          this.createAttackHitbox();
          console.log('[HITSTOP DEBUG] Attack hitbox created');
        }
        // Remove this handler for future swings
        this.sprite.off('animationupdate', this.animationUpdateHandler as any);
      }
    };
    
    // Add animation complete handler to hold on last frame
    const animationCompleteHandler = (anim: Phaser.Animations.Animation) => {
      if (anim.key === 'kilboy_swing_anim') {

        const timeSinceLastHit = this.scene.time.now - this.lastPurpleCubeHitTime;
        if (timeSinceLastHit <= 200) {
          // Recently hit a purple cube, hold on last frame regardless of which frame we're on

          this.isHoldingSwingFrame = true;
          console.log('[HITSTOP DEBUG] Holding swing frame');
          // Stop the animation system completely
          this.sprite.anims.stop();
          // Explicitly set to the last texture of the swing animation
          this.sprite.setTexture('kilboy_swing_anim3');
          
          // AttackHitbox will stay active during swing frame holding (no timer to cancel)

          
          // Start periodic check to see when to exit
          if (this.swingFrameCheckTimer) {
            this.swingFrameCheckTimer.remove();
          }
          this.swingFrameCheckTimer = this.scene.time.addEvent({
            delay: 5, // Check every 5ms for responsiveness
            callback: this.checkSwingFrameExit,
            callbackScope: this,
            loop: true
          });
        } else {
          // No recent hit, exit normally and clean up attackHitbox

          if (this.attackHitbox) {
            if ((this.scene as any).hitStop) {
              (this.scene as any).hitStop.unregister(this.attackHitbox);
            }
            this.attackHitbox.destroy();
            this.attackHitbox = undefined;
            console.log('[HITSTOP DEBUG] Attack hitbox destroyed');
          }
          this.sprite.off('animationcomplete', animationCompleteHandler);
        }
      }
    };
    this.sprite.on('animationcomplete', animationCompleteHandler);
    this.sprite.on('animationupdate', this.animationUpdateHandler as any);

    // Create hitStopCheck hitbox to the right of Kilboy
    this.createHitStopCheckHitbox();
    return true;
  }

  private createHitStopCheckHitbox() {
    // Clean up existing attack hitboxes if they exist
    if (this.hitStopCheck) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.hitStopCheck);
      }
      this.hitStopCheck.destroy();
      this.hitStopCheck = undefined;
    }
    if (this.attackHitbox) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.attackHitbox);
      }
      this.attackHitbox.destroy();
      this.attackHitbox = undefined;
    }
    if (this.hitStopCheckTimer) {
      this.hitStopCheckTimer.remove();
      this.hitStopCheckTimer = undefined;
    }

    
    // Use fixed values for hitstop hitbox size and position
    const hitstopX = this.sprite.x + Player.HITSTOP_OFFSET_X;
    const hitstopY = this.sprite.y + this.sprite.height / 2 + Player.HITSTOP_OFFSET_Y;
    
    // Create hitStopCheck hitbox for collision detection
    this.hitStopCheck = this.scene.add.circle(hitstopX, hitstopY, Player.HITSTOP_RADIUS, 0xff0000, 0.3);
    this.scene.physics.add.existing(this.hitStopCheck);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setCircle(Player.HITSTOP_RADIUS);
    this.hitStopCheck.setAlpha(0);
    
    // Register hitStopCheck hitbox with hitStop
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(this.hitStopCheck);
    }
    
    // Set up overlap detection with pipe containers to trigger purple cube generation
    this.scene.physics.add.overlap(
      this.hitStopCheck!,
      (this.scene as any).upperPipeManager?.pipes,
      (hitStop: any, pipeContainer: any) => {
        // Generate purple cubes for this pipe if not already generated
        (this.scene as any).upperPipeManager?.generatePurpleCubesForPipe(pipeContainer);
      },
      undefined,
      this
    );

    // Set up overlap with purple cubes for the hitStopCheck hitbox
    this.scene.physics.add.overlap(
      this.hitStopCheck!,
      (this.scene as any).upperPipeManager?.purpleHitboxes,
      (attack: any, purple: any) => {
        // Only trigger hitstop and dash if the purple cube can still damage
        if (purple.canDamage === false) return;
        // Check global hitstop cooldown
        if (this.hitstopCooldownActive) return;
        
        // Update last purple cube hit timestamp
        this.lastPurpleCubeHitTime = this.scene.time.now;
        
        // Disable all purple cubes in the same pipe when any cube is hit
        this.disableAllPurpleCubesInPipe(purple);
        
        // On collision, trigger hitstop and destroy the hitStopCheck hitbox immediately
        // Only trigger hitstop when jump count is 0 (first swing)
        if ((this.scene as any).hitStop && !this.hitstopTriggered && (this.scene as any).jumpCount === 1) {
          this.canFlap = false;
          this.hitstopTriggeredThisSwing = true;
          this.hitstopTriggered = true;
          // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
          purple.canDamage = false;
          // Activate global hitstop cooldown
          this.hitstopCooldownActive = true;
          this.scene.time.delayedCall(1000, () => {
            this.hitstopCooldownActive = false;
          });
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.startDash();
          });
        }
        if (this.hitStopCheck) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.hitStopCheck);
          }
          this.hitStopCheck.destroy();
          this.hitStopCheck = undefined;
        }
        // Remove animation update handler so it doesn't create the second hitbox
        if (this.animationUpdateHandler) {
          this.sprite.off('animationupdate', this.animationUpdateHandler as any);
        }
      },
      undefined,
      this
    );

    // Set up overlap with maroon cubes for the hitStopCheck hitbox
    this.scene.physics.add.overlap(
      this.hitStopCheck!,
      (this.scene as any).lowerPipeManager?.maroonHitboxes,
      (attack: any, maroon: any) => {
        // Only trigger hitstop and dash if the maroon cube can still damage
        if (maroon.canDamage === false) return;
        // Check global hitstop cooldown
        if (this.hitstopCooldownActive) return;
        
        // Update last maroon cube hit timestamp
        this.lastPurpleCubeHitTime = this.scene.time.now;
        
        // Disable all maroon cubes in the same pipe when any cube is hit
        this.disableAllMaroonCubesInPipe(maroon);
        
        // Trigger fall for maroon cubes above the hit cube
        (this.scene as any).lowerPipeManager.triggerFallForHitboxesAbove(maroon, false, false);
        
        // On collision, trigger hitstop and destroy the hitStopCheck hitbox immediately
        // Only trigger hitstop when jump count is 0 (first swing)
        if ((this.scene as any).hitStop && !this.hitstopTriggered && (this.scene as any).jumpCount === 1) {
          this.canFlap = false;
          this.hitstopTriggeredThisSwing = true;
          this.hitstopTriggered = true;
          // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
          maroon.canDamage = false;
          // Activate global hitstop cooldown
          this.hitstopCooldownActive = true;
          this.scene.time.delayedCall(1000, () => {
            this.hitstopCooldownActive = false;
          });
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.startDash();
          });
        }
        if (this.hitStopCheck) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.hitStopCheck);
          }
          this.hitStopCheck.destroy();
          this.hitStopCheck = undefined;
        }
        // Remove animation update handler so it doesn't create the second hitbox
        if (this.animationUpdateHandler) {
          this.sprite.off('animationupdate', this.animationUpdateHandler as any);
        }
      },
      undefined,
      this
    );

    // Set up overlap with enemies for the hitStopCheck hitbox
    this.scene.physics.add.overlap(
      this.hitStopCheck!,
      (this.scene as any).enemies,
      (attack: any, enemy: any) => {
        // Check if enemy can still be hit
        if (enemy.canStillDamagePlayer()) {
          enemy.handlePlayerAttack();
  
        }
      },
      undefined,
      this
    );
  }

  private createAttackHitbox() {
    // Clean up existing attack hitbox if it exists
    if (this.attackHitbox) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.attackHitbox);
      }
      this.attackHitbox.destroy();
      this.attackHitbox = undefined;
    }
    // Look ahead hitbox is now permanent - no need to clean up
    // Use fixed values for attack hitbox size and position
    const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
    const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
    // Create attack hitbox
    this.attackHitbox = this.scene.add.circle(attackX, attackY, Player.ATTACK_RADIUS, 0x00ff00, 0.3);
    this.scene.physics.add.existing(this.attackHitbox);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setCircle(Player.ATTACK_RADIUS);
    this.attackHitbox.setAlpha(0); // Fully invisible
    // Do NOT register attack hitbox with hitStop
    
    // Set up overlap detection with pipe containers to trigger purple cube generation
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).upperPipeManager?.pipes,
      (attack: any, pipeContainer: any) => {
        // Generate purple cubes for this pipe if not already generated
        (this.scene as any).upperPipeManager?.generatePurpleCubesForPipe(pipeContainer);
      },
      undefined,
      this
    );

    // Set up overlap with purple cubes for the attack hitbox (push effect, no hitstop)
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).upperPipeManager?.purpleHitboxes,
      (attack: any, purple: any) => {
        // Only trigger pipe cut hitstop if the purple cube is fully opaque (not fading)
        if ((this.scene as any).pipeCutHitStop && purple.alpha >= 1) {
          console.log("[PIPE CUT HITSTOP] Triggered by attack hitbox hitting purple cube!");
          (this.scene as any).pipeCutHitStop.trigger();
        }
        
        // Simulate Kilboy's upward hit on purple cube (push effect)
        purple.canDamage = false;
        // Disable all purple cubes in the same pipe
        this.disableAllPurpleCubesInPipe(purple);
        // Update last purple cube hit timestamp
        this.lastPurpleCubeHitTime = this.scene.time.now;
        if (purple.body && purple.body instanceof Phaser.Physics.Arcade.Body) {
          // Move to falling group to prevent collision with player
          (this.scene as any).upperPipeManager.purpleHitboxes.remove(purple);
          (this.scene as any).upperPipeManager.fallingPurpleHitboxes.add(purple);
          
          purple.body.setAllowGravity(true);
          purple.body.setGravityY(800);
          const randomX = Phaser.Math.Between(70, 110);
          const randomY = Phaser.Math.Between(-170, -130);
          purple.body.setVelocity(randomX, randomY);
          
          // Start fading immediately when X velocity is applied
          this.scene.tweens.add({
            targets: purple,
            alpha: 0,
            duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
            ease: 'Linear',
          });
        }
        (this.scene as any).upperPipeManager.triggerFallForHitboxesBelow(purple, false, false);
      },
      undefined,
      this
    );

    // Set up overlap with maroon cubes for the attack hitbox (push effect, no hitstop)
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).lowerPipeManager?.maroonHitboxes,
      (attack: any, maroon: any) => {
        // Only trigger pipe cut hitstop if the maroon cube is fully opaque (not fading)
        if ((this.scene as any).pipeCutHitStop && maroon.alpha >= 1) {
          console.log("[PIPE CUT HITSTOP] Triggered by attack hitbox hitting maroon cube!");
          (this.scene as any).pipeCutHitStop.trigger();
        }
        
        // Simulate Kilboy's upward hit on maroon cube (push effect)
        maroon.canDamage = false;
        maroon.wasAttacked = true; // Mark as attacked to prevent column fall inclusion
        // Disable all maroon cubes in the same pipe
        this.disableAllMaroonCubesInPipe(maroon);
        // Update last maroon cube hit timestamp
        this.lastPurpleCubeHitTime = this.scene.time.now;
        if (maroon.body && maroon.body instanceof Phaser.Physics.Arcade.Body) {
          maroon.body.setAllowGravity(true);
          maroon.body.setGravityY(800);
          const randomX = Phaser.Math.Between(70, 110);
          const randomY = Phaser.Math.Between(-170, -130);
          maroon.body.setVelocity(randomX, randomY);
        }
        // Start fading immediately when velocity is applied (same as purple cubes)
        this.scene.tweens.add({
          targets: maroon,
          alpha: 0,
          duration: PipeManager.MAROON_CUBE_FADE_DURATION,
          ease: 'Linear',
        });

      },
      undefined,
      this
    );

    // Set up overlap with enemies for the attack hitbox
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).enemies,
      (attack: any, enemy: any) => {
        // Check if enemy can still be hit
        if (enemy.canStillDamagePlayer()) {
          enemy.handlePlayerAttack();
  
        }
      },
      undefined,
      this
    );
    
    // Look ahead hitbox is now permanent - already exists
    
    // AttackHitbox will be destroyed when swing animation ends, no timer needed
  }

  private createLookAheadHitbox() {
    // Create a rectangular hitbox that extends forward from Kilboy to detect purple cubes ahead
    const lookAheadWidth = 24; // How far ahead to detect (80% smaller: 120 * 0.2)
    const lookAheadHeight = (this.sprite.height) ; // 80% smaller
    const lookAheadX = this.sprite.x + this.sprite.width; // Start from Kilboy's right edge
    const lookAheadY = this.sprite.y + (this.sprite.height / 2) - (lookAheadHeight / 2); // Center vertically
    
    this.lookAheadHitbox = this.scene.add.rectangle(lookAheadX, lookAheadY, lookAheadWidth, lookAheadHeight, 0xffff00, 0.2);
    this.lookAheadHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(this.lookAheadHitbox);
    (this.lookAheadHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.lookAheadHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.lookAheadHitbox.setAlpha(0); // Invisible for production
    
    // Collision detection will be set up in PlayScene's createColiders() method
  }

  setInvincible(invincible: boolean) {
    this.invincible = invincible;
    if (invincible) {
      this.sprite.setTexture('kilboy_hurt');
      this.startInvincibleFlash();
    } else {
      this.stopInvincibleFlash();
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setAlpha(1);
      this.sprite.setTexture('kilboy');
    }
  }

  private startInvincibleFlash() {
    this.stopInvincibleFlash();
    this.invincibleFlashTimer = this.scene.time.addEvent({
      delay: 40,
      callback: this.toggleInvincibleOpacity,
      callbackScope: this,
      loop: true
    });
  }

  private stopInvincibleFlash() {
    if (this.invincibleFlashTimer) {
      this.invincibleFlashTimer.remove();
      this.invincibleFlashTimer = undefined;
    }
  }

  private toggleInvincibleOpacity() {
    if (this.invincible) {
      const currentAlpha = this.sprite.alpha;
      const targetAlpha = currentAlpha === 0.1 ? 0.9 : 0.1;
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: targetAlpha,
        duration: 40,
      });
    }
  }

  // Handles collision with a purple hitbox
  public handlePurpleHitboxCollision(purpleHitbox: Phaser.GameObjects.GameObject, pipeManager: any, isGameOver: boolean): boolean {
    // Always trigger fall for hitboxes below on any purple cube contact (including dash)
    // This must happen BEFORE canDamage check so dash collisions still trigger column collapse
    pipeManager.triggerFallForHitboxesBelow(purpleHitbox as Phaser.GameObjects.Rectangle, isGameOver, this.isDashing);
    if (this.isDashing) {
      
    }
    
    // Check canDamage after column collapse to allow dash to trigger columns
    if ((purpleHitbox as any).canDamage === false) return false;
    

    
    // Check global hitstop cooldown
    if (this.hitstopCooldownActive) return false;
    
    // During dash: trigger purple boxes but don't take damage
    if (this.isDashing) {
      
      
      // Disable all purple cubes in the same pipe
      this.disableAllPurpleCubesInPipe(purpleHitbox as Phaser.GameObjects.Rectangle);
      
      // Apply destruction effect to the hit purple box
      const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800);
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
        
        // Start fading immediately when X velocity is applied
        this.scene.tweens.add({
          targets: hitbox,
          alpha: 0,
          duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
          ease: 'Linear',
        });
      }
      
      return false; // No damage during dash
    }
    
    const anim = this.sprite.anims;
    // Check if currently in swing animation (any frame) or holding on last frame OR have active attack hitbox
    const isInSwingAnimation = (anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim") || this.isHoldingSwingFrame || !!this.attackHitbox;
    // Check if currently in attack animation on first frame  
    const isInAttackAnimationFirstFrame = anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim" && anim.currentFrame?.index === 1;
    
    // Special case: Attack destruction (first frame + upward movement)
    if (isInAttackAnimationFirstFrame && this.sprite && this.sprite.body && (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y < 0) {
      // Trigger hitstop
      // (this.scene as any).hitStop?.trigger(1000); // Temporarily disabled
      // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
      (purpleHitbox as any).canDamage = false;
      // Disable all purple cubes in the same pipe
      this.disableAllPurpleCubesInPipe(purpleHitbox as Phaser.GameObjects.Rectangle);
      // Activate global hitstop cooldown
      this.hitstopCooldownActive = true;
      this.scene.time.delayedCall(1500, () => {
        this.hitstopCooldownActive = false;
      });
      
      // Apply gravity to the individual purple hitbox (attack destruction)
      const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800); // Stronger gravity (was 400)
        // Randomize velocity for more varied destruction effect
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
        
        // Start fading immediately when X velocity is applied
        this.scene.tweens.add({
          targets: hitbox,
          alpha: 0,
          duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
          ease: 'Linear',
        });
      }
      return false; // No damage during attack destruction
    }
    
    // If swinging (any frame) or have active attack hitbox, immune to damage
    if (isInSwingAnimation) {
      return false; // No damage during swing animation
    }
    // Prevent hit if Kilboy is below the next blue box
    let nextBlue: any = null;
    if (pipeManager && pipeManager.blueHitboxes) {
      const playerX = this.sprite.x;
      let minDX = Infinity;
      pipeManager.blueHitboxes.getChildren().forEach((blue: any) => {
        if (blue.x > playerX && blue.x - playerX < minDX) {
          minDX = blue.x - playerX;
          nextBlue = blue;
        }
      });
    }
    if (nextBlue && this.sprite.y > nextBlue.y) {
      return false; // Block hit if Kilboy is below the blue box
    }

    // Not moving upward: trigger damage and stop velocity
    this.stopVelocityOnDamage();
    
    // Move hitbox to falling group after damage is processed
    const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
    if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
      const body = hitbox.body as Phaser.Physics.Arcade.Body;
      if (Math.abs(body.velocity.x) > 5 || Math.abs(body.velocity.y) > 5) {
        // Move to falling group to prevent further collisions
        (this.scene as any).upperPipeManager.purpleHitboxes.remove(hitbox);
        (this.scene as any).upperPipeManager.fallingPurpleHitboxes.add(hitbox);
      }
    }
    
    return true;
  }

  // Handles collision with a maroon hitbox (lower pipe cubes)
  public handleMaroonHitboxCollision(maroonHitbox: Phaser.GameObjects.GameObject, pipeManager: any, isGameOver: boolean): boolean {
    // Check opacity - if cube is fading (alpha < 1), don't allow collision
    if ((maroonHitbox as any).alpha < 1) return false;
    
    // Always trigger fall for hitboxes above on any maroon cube contact (including dash)
    // This must happen BEFORE canDamage check so dash collisions still trigger column collapse
    pipeManager.triggerFallForHitboxesAbove(maroonHitbox as Phaser.GameObjects.Rectangle, isGameOver, this.isDashing);
    if (this.isDashing) {
      
    }
    
    // Check canDamage
    if ((maroonHitbox as any).canDamage === false) return false;
    

    
    // Check global hitstop cooldown
    if (this.hitstopCooldownActive) return false;
    
    // During dash: trigger maroon boxes but don't take damage
    if (this.isDashing) {
      
      // Disable all maroon cubes in the same pipe
      this.disableAllMaroonCubesInPipe(maroonHitbox as Phaser.GameObjects.Rectangle);
      
      // Apply destruction effect to the hit maroon box
      const hitbox = maroonHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800);
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
      }
      // Start fading immediately when velocity is applied (same as purple cubes)
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: PipeManager.MAROON_CUBE_FADE_DURATION,
        ease: 'Linear',
      });
      
      return false; // No damage during dash
    }
    
    const anim = this.sprite.anims;
    // Check if currently in swing animation (any frame) or holding on last frame OR have active attack hitbox
    const isInSwingAnimation = (anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim") || this.isHoldingSwingFrame || !!this.attackHitbox;
    // Check if currently in attack animation on first frame  
    const isInAttackAnimationFirstFrame = anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim" && anim.currentFrame?.index === 1;
    
    // Special case: Attack destruction (first frame + upward movement)
    if (isInAttackAnimationFirstFrame && this.sprite && this.sprite.body && (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y < 0) {
      // Trigger hitstop
      // (this.scene as any).hitStop?.trigger(1000); // Temporarily disabled
      // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
      (maroonHitbox as any).canDamage = false;
      // Disable all maroon cubes in the same pipe
      this.disableAllMaroonCubesInPipe(maroonHitbox as Phaser.GameObjects.Rectangle);
      // Activate global hitstop cooldown
      this.hitstopCooldownActive = true;
      this.scene.time.delayedCall(1500, () => {
        this.hitstopCooldownActive = false;
      });
      
      // Apply gravity to the individual maroon hitbox (attack destruction)
      const hitbox = maroonHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800); // Stronger gravity (was 400)
        // Randomize velocity for more varied destruction effect
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
      }
      // Start fading immediately when velocity is applied (same as purple cubes)
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: PipeManager.MAROON_CUBE_FADE_DURATION,
        ease: 'Linear',
      });
      return false; // No damage during attack destruction
    }
    
    // If swinging (any frame) or have active attack hitbox, immune to damage
    if (isInSwingAnimation) {
      return false; // No damage during swing animation
    }
    
    // Maroon cubes don't check for blue box positioning like purple cubes
    // They provide direct damage when touched
    
    // Not moving upward: trigger damage and stop velocity
    this.stopVelocityOnDamage();
    return true;
  }

  // Stop velocity when taking damage from hitboxes
  private stopVelocityOnDamage() {
    if (this.sprite && this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      // Preserve X velocity for chunk-based movement - don't stop horizontal movement
      // (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    }
  }

  // Add public invincibility API
  public enableInvincibility() {
    if (this.invincible) return; // Do not trigger if already invincible
    this.setInvincible(false);
    if (this.invincibleTimeout) this.invincibleTimeout.remove();
    this.sprite.setAlpha(1);
    this.setInvincible(true);
    this.invincibleTimeout = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        this.setInvincible(false);
        // No need to set alpha here, handled in setInvincible
      },
      callbackScope: this
    });
  }

  public disableInvincibility() {
    this.setInvincible(false);
    if (this.invincibleTimeout) this.invincibleTimeout.remove();
    // No need to set alpha here, handled in setInvincible
  }

  public get isInvincible() {
    return this.invincible;
  }

  public get isHoldingSwingFrameActive() {
    return this.isHoldingSwingFrame;
  }

  public getHealth(): number {
    // For UI, only show up to 3 icons (remaining health above 1)
    return Math.max(0, this.health - 1);
  }

  public takeHit(): boolean {
    if (this.invincible) return false;
    this.health--;
    this.enableInvincibility();
    // Die only when health reaches 0 (4th hit)
    return this.health <= 0;
  }

  // Call this from PlayScene's update loop
  public updateAttackHitboxPosition() {
    if (this.hitStopCheck && this.sprite) {
      const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
      const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
      this.hitStopCheck.setPosition(attackX, attackY);
    }
    if (this.attackHitbox && this.sprite) {
      const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
      const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
      this.attackHitbox.setPosition(attackX, attackY);
    }
    if (this.lookAheadHitbox && this.sprite) {
      const lookAheadX = this.sprite.x + this.sprite.width;
      const lookAheadY = this.sprite.y + (this.sprite.height / 2) - (this.lookAheadHitbox.height / 2);
      this.lookAheadHitbox.setPosition(lookAheadX, lookAheadY);
    }
  }

  // Sync upper hitbox to follow the sprite's upper half
  public syncUpperHitbox(): void {
    if (this.upperHitbox && this.sprite.body) {
      const spriteBody = this.sprite.body as Phaser.Physics.Arcade.Body;
      const spriteWidth = spriteBody.width;
      const spriteOffsetX = spriteBody.offset.x;
      const spriteOffsetY = spriteBody.offset.y;
      
      // Calculate the exact position relative to the sprite's world position
      const worldX = this.sprite.x + spriteOffsetX + spriteWidth / 2;
      const worldY = this.sprite.y + spriteOffsetY - spriteBody.height / 2;
      
      // Set position directly without any additional calculations
      this.upperHitbox.setPosition(worldX, worldY);
    }
  }

  // Remove preUpdate syncing
  public preUpdate(): void {}

  // Check if we should exit the swing frame hold state
  private checkSwingFrameExit(): void {
    if (!this.isHoldingSwingFrame) return;
    
    const timeSinceLastHit = this.scene.time.now - this.lastPurpleCubeHitTime;
    
    // Re-enforce the texture in case something else changed it
    if (this.sprite.texture.key !== 'kilboy_swing_anim3') {
      this.sprite.setTexture('kilboy_swing_anim3');
    }
    
    // While holding swing pose, actively cut through purple cubes
    this.cutThroughPurpleCubes();
    
    // Check if there are purple cubes ahead using manual detection
    this.cubesDetectedAhead = this.detectCubesAhead();
    
    // Only exit if both conditions are met:
    // 1. It's been more than the timeout since last hit (longer if cubes ahead)
    // 2. There are no purple cubes ahead in Kilboy's path
    const timeout = this.cubesDetectedAhead ? 500 : 20; // Much shorter timeout when path is clear
    
    if (timeSinceLastHit > timeout && !this.cubesDetectedAhead) {
      // No recent hit and no cubes ahead, exit swing state
      
      this.isHoldingSwingFrame = false;
      console.log('[HITSTOP DEBUG] Exiting swing frame hold');
      this.sprite.anims.stop();
      // Reset to default texture
      this.sprite.setTexture('kilboy');
      
      // Clean up extended attackHitbox
      if (this.attackHitbox) {
        if ((this.scene as any).hitStop) {
          (this.scene as any).hitStop.unregister(this.attackHitbox);
        }
        this.attackHitbox.destroy();
        this.attackHitbox = undefined;

      }
      
      // Look ahead hitbox is now permanent - no need to clean up
      
      // Clean up timer
      if (this.swingFrameCheckTimer) {
        this.swingFrameCheckTimer.remove();
        this.swingFrameCheckTimer = undefined;
      }
    } else if (this.cubesDetectedAhead && timeSinceLastHit > 200) {
      
    }
  }
  
  // Disable all purple cubes from the same pipe when one is hit
  private disableAllPurpleCubesInPipe(hitPurpleCube: Phaser.GameObjects.Rectangle): void {
    const upperPipeManager = (this.scene as any).upperPipeManager;
    if (!upperPipeManager || !upperPipeManager.pipes) return;

    // Find which pipe this purple cube belongs to
    upperPipeManager.pipes.getChildren().forEach((pipe: any) => {
      const upperPipe = pipe as Phaser.GameObjects.Container;
      if (upperPipe && (upperPipe as any).purpleHitboxes) {
        const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
        
        // Check if the hit cube is in this pipe's hitboxes
        if (pipeHitboxes.includes(hitPurpleCube)) {
    
          // Disable all purple cubes in this pipe
          pipeHitboxes.forEach((cube: any) => {
            cube.canDamage = false;
          });
          return; // Found the pipe, no need to check others
        }
      }
    });
  }

  // Disable all maroon cubes from the same pipe when one is hit
  private disableAllMaroonCubesInPipe(hitMaroonCube: Phaser.GameObjects.Rectangle): void {
    const lowerPipeManager = (this.scene as any).lowerPipeManager;
    if (!lowerPipeManager || !lowerPipeManager.pipes) return;

    // Find which pipe this maroon cube belongs to
    lowerPipeManager.pipes.getChildren().forEach((pipe: any) => {
      const lowerPipe = pipe as Phaser.GameObjects.Container;
      if (lowerPipe && (lowerPipe as any).maroonHitboxes) {
        const pipeHitboxes = (lowerPipe as any).maroonHitboxes as Phaser.GameObjects.Rectangle[];
        
        // Check if the hit cube is in this pipe's hitboxes
        if (pipeHitboxes.includes(hitMaroonCube)) {
    
          // Disable all maroon cubes in this pipe
          pipeHitboxes.forEach((cube: any) => {
            cube.canDamage = false;
          });
          return; // Found the pipe, no need to check others
        }
      }
    });
  }

  // Manually detect if there are purple cubes ahead of Kilboy
  private detectCubesAhead(): boolean {
    const upperPipeManager = (this.scene as any).upperPipeManager;
    if (!upperPipeManager || !upperPipeManager.purpleHitboxes) return false;

    // Define look-ahead area (80% smaller: same dimensions as createLookAheadHitbox)
    const lookAheadWidth = 24;
    const lookAheadHeight = (this.sprite.height) ;
    const lookAheadX = this.sprite.x + this.sprite.width;
    const lookAheadY = this.sprite.y + (this.sprite.height / 2) - (lookAheadHeight / 2);
    
    const lookAheadBounds = new Phaser.Geom.Rectangle(lookAheadX, lookAheadY, lookAheadWidth, lookAheadHeight);
    
    // Check if any purple cubes are in the look-ahead area
    let cubesFound = false;
    upperPipeManager.purpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (!purpleHitbox.active || (purpleHitbox as any).canDamage === false) return;
      
      const purpleBounds = purpleHitbox.getBounds();
      
      if (Phaser.Geom.Rectangle.Overlaps(lookAheadBounds, purpleBounds)) {
        cubesFound = true;
  
      }
    });
    
    return cubesFound;
  }

  // Actively cut through purple cubes while holding swing pose
  private cutThroughPurpleCubes(): void {
    const upperPipeManager = (this.scene as any).upperPipeManager;
    if (!upperPipeManager || !upperPipeManager.purpleHitboxes) return;

    const playerBounds = this.sprite.getBounds();
    
    upperPipeManager.purpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
      if (!purpleHitbox.active || (purpleHitbox as any).canDamage === false) return;
      
      const purpleBounds = purpleHitbox.getBounds();
      
      // Check if Kilboy overlaps with this purple cube
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, purpleBounds)) {
        // Cut through this purple cube
        this.lastPurpleCubeHitTime = this.scene.time.now; // Reset timer
        (purpleHitbox as any).canDamage = false;
        // Disable all purple cubes in the same pipe
        this.disableAllPurpleCubesInPipe(purpleHitbox);
        
        // Apply destruction effect
        if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
          // Move to falling group to prevent collision with player
          (this.scene as any).upperPipeManager.purpleHitboxes.remove(purpleHitbox);
          (this.scene as any).upperPipeManager.fallingPurpleHitboxes.add(purpleHitbox);
          
          purpleHitbox.body.setAllowGravity(true);
          purpleHitbox.body.setGravityY(800);
          const randomX = Phaser.Math.Between(70, 110);
          const randomY = Phaser.Math.Between(-170, -130);
          purpleHitbox.body.setVelocity(randomX, randomY);
          
          // Start fading immediately when X velocity is applied
          this.scene.tweens.add({
            targets: purpleHitbox,
            alpha: 0,
            duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
            ease: 'Linear',
          });
        }
        
        // Trigger column collapse
        upperPipeManager.triggerFallForHitboxesBelow(purpleHitbox, false, false);
      }
    });
  }



  // Dash state: disables jump, sets x velocity to +50, tweens back to 0 over 100ms, then re-enables jump
  private startDash() {
    if (this.isDashing) return;
    this.isDashing = true;
    this.canFlap = false;
    if (this.dashTween) this.dashTween.stop();
    const dashBody = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (dashBody) {
      // Get the constant X velocity from PlayScene for chunk-based movement
      const playScene = this.scene as any;
      const playerXVelocity = playScene.PLAYER_X_VELOCITY || 100;
      
      // Set dash velocity (higher X for dash effect, don't touch Y velocity)
      dashBody.setVelocityX(1000);
      // Don't set Y velocity - let gravity handle it naturally
      
      let current = { v: 1000 };
      this.dashTween = this.scene.tweens.add({
        targets: current,
        v: playerXVelocity, // Tween back to the constant X velocity, not 0
        duration: 200,
        ease: 'Linear',
        onUpdate: () => {
          dashBody.setVelocityX(current.v);
          // Don't set Y velocity - let gravity handle it naturally
        },
        onComplete: () => {
          // Restore to the constant X velocity for chunk-based movement
          dashBody.setVelocityX(playerXVelocity);
          // Don't set Y velocity - let gravity handle it naturally
          this.isDashing = false;
          this.canFlap = true;
        }
      });
    }
  }
} 