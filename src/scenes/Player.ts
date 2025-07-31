import Phaser from "phaser";
import PipeManager from "./PipeManager";
import PlayerHitboxes from "../PlayerHitboxes";

export default class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private invincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;
  private health: number = 4;
  private invincibleTimeout?: Phaser.Time.TimerEvent;
  private hitStopCheckTimer?: Phaser.Time.TimerEvent;
  public canFlap: boolean = true;
  // PlayerHitboxes instance to handle all hitboxes
  public hitboxes: PlayerHitboxes;
  


  private hitstopTriggeredThisSwing: boolean = false;
  private hitstopTriggered: boolean = false;
  private animationUpdateHandler?: Function;
  private isDashing: boolean = false;
  private dashTween?: Phaser.Tweens.Tween;
  private hitstopCooldownActive: boolean = false;
  private lastPurpleCubeHitTime: number = 0;
  public isHoldingSwingFrame: boolean = false;
  private swingFrameCheckTimer?: Phaser.Time.TimerEvent;
  public cubesDetectedAhead: boolean = false;
  public isLedgeGrabbing: boolean = false;
  
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
    
    // Create run animation (looping) - only if it doesn't exist
    if (!this.scene.anims.exists("kilboy_run_anim")) {
    this.scene.anims.create({
      key: "kilboy_run_anim",
      frames: [
        { key: "kilboy_run1" },
        { key: "kilboy_run2" },
        { key: "kilboy_run3" },
        { key: "kilboy_run4" },
        { key: "kilboy_run5" },
        { key: "kilboy_run6" },
        { key: "kilboy_run7" },
        { key: "kilboy_run8" },
        { key: "kilboy_run9" },
        { key: "kilboy_run10" },
      ],
      frameRate: 12,
      repeat: -1, // Loop infinitely
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

    // Initialize PlayerHitboxes instance
    this.hitboxes = new PlayerHitboxes(this.scene, this);
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
      if (this.hitboxes.attackHitbox) {
        if ((this.scene as any).hitStop) {
          (this.scene as any).hitStop.unregister(this.hitboxes.attackHitbox);
        }
        this.hitboxes.attackHitbox.destroy();
        this.hitboxes.attackHitbox = undefined;
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
        if (this.hitboxes.hitStopCheck) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.hitboxes.hitStopCheck);
          }
          this.hitboxes.hitStopCheck.destroy();
          this.hitboxes.hitStopCheck = undefined;
        }
        // If hitstop was NOT triggered, create the attack hitbox immediately
        if (!this.hitstopTriggeredThisSwing) {
          this.hitboxes.createAttackHitbox();
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

          if (this.hitboxes.attackHitbox) {
            if ((this.scene as any).hitStop) {
              (this.scene as any).hitStop.unregister(this.hitboxes.attackHitbox);
            }
            this.hitboxes.attackHitbox.destroy();
            this.hitboxes.attackHitbox = undefined;
            console.log('[HITSTOP DEBUG] Attack hitbox destroyed');
          }
          this.sprite.off('animationcomplete', animationCompleteHandler);
        }
      }
    };
    this.sprite.on('animationcomplete', animationCompleteHandler);
    this.sprite.on('animationupdate', this.animationUpdateHandler as any);

    // Create hitStopCheck hitbox to the right of Kilboy
    this.hitboxes.createHitStopCheckHitbox();
    return true;
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
    const isInSwingAnimation = (anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim") || this.isHoldingSwingFrame || !!this.hitboxes.attackHitbox;
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
    // Check both upper and floating pipe blue hitboxes
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
    // Also check floating pipe blue hitboxes if not already found
    if (!nextBlue && (this.scene as any).floatingPipeManager && (this.scene as any).floatingPipeManager.blueHitboxes) {
      const playerX = this.sprite.x;
      let minDX = Infinity;
      (this.scene as any).floatingPipeManager.blueHitboxes.getChildren().forEach((blue: any) => {
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
        const upperPipeManager = (this.scene as any).upperPipeManager;
        const floatingPipeManager = (this.scene as any).floatingPipeManager;
        if (upperPipeManager && upperPipeManager.purpleHitboxes.contains(hitbox)) {
          upperPipeManager.purpleHitboxes.remove(hitbox);
          upperPipeManager.fallingPurpleHitboxes.add(hitbox);
        } else if (floatingPipeManager && floatingPipeManager.floatingPurpleHitboxes.contains(hitbox)) {
          floatingPipeManager.floatingPurpleHitboxes.remove(hitbox);
          floatingPipeManager.fallingPurpleHitboxes.add(hitbox);
        }
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
        // Move to falling group to prevent collision with player
        (this.scene as any).lowerPipeManager.maroonHitboxes.remove(hitbox);
        (this.scene as any).lowerPipeManager.fallingMaroonHitboxes.add(hitbox);
        
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
    const isInSwingAnimation = (anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim") || this.isHoldingSwingFrame || !!this.hitboxes.attackHitbox;
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
        // Move to falling group to prevent collision with player
        (this.scene as any).lowerPipeManager.maroonHitboxes.remove(hitbox);
        (this.scene as any).lowerPipeManager.fallingMaroonHitboxes.add(hitbox);
        
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

  // Handles collision with a brown hitbox (floating pipe cubes)
  public handleBrownHitboxCollision(brownHitbox: Phaser.GameObjects.GameObject, pipeManager: any, isGameOver: boolean): boolean {
    // Check opacity - if cube is fading (alpha < 1), don't allow collision
    if ((brownHitbox as any).alpha < 1) return false;
    
    // Find the specific pipe that contains this brown hitbox and check if any cube in that pipe is falling
    const floatingPipeManager = (this.scene as any).floatingPipeManager;
    let shouldDisableDamage = false;
    if (floatingPipeManager && floatingPipeManager.pipes) {
      floatingPipeManager.pipes.getChildren().forEach((pipe: any) => {
        if ((pipe as any).brownHitboxes) {
          const pipeHitboxes = (pipe as any).brownHitboxes as Phaser.GameObjects.Rectangle[];
          // Check if this specific brown hitbox belongs to this pipe
          if (pipeHitboxes.includes(brownHitbox as Phaser.GameObjects.Rectangle)) {
            const hasFallingCube = pipeHitboxes.some((hitbox: any) => hitbox.alpha < 1);
            const hasUsedLedgeGrab = (pipe as any).ledgeGrabUsed === true;
            if (hasFallingCube || hasUsedLedgeGrab) {
              // If any cube in this specific pipe is falling OR ledge grab has been used, disable damage for all cubes in this pipe
              pipeHitboxes.forEach((hitbox: any) => {
                (hitbox as any).canDamage = false;
              });
              shouldDisableDamage = true;
            }
          }
        }
      });
    }
    
    // If damage should be disabled, return early
    if (shouldDisableDamage) return false;
    
    // Always trigger fall for hitboxes in the same column on any brown cube contact (including dash)
    // This must happen BEFORE canDamage check so dash collisions still trigger column collapse
    pipeManager.triggerFallForHitboxesInColumn(brownHitbox as Phaser.GameObjects.Rectangle, isGameOver);
    if (this.isDashing) {
      
    }
    
    // Check canDamage
    if ((brownHitbox as any).canDamage === false) return false;
    
    // Check global hitstop cooldown
    if (this.hitstopCooldownActive) return false;
    
    // During dash: trigger brown boxes but don't take damage
    if (this.isDashing) {
      // Apply destruction effect to the hit brown box
      const hitbox = brownHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        // Move to falling group to prevent collision with player
        (this.scene as any).floatingPipeManager.brownHitboxes.remove(hitbox);
        (this.scene as any).floatingPipeManager.fallingBrownHitboxes.add(hitbox);
        
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800);
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
      }
      // Start fading immediately when velocity is applied
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: 1000, // Same as triggerFallForHitboxesInColumn
        ease: 'Linear',
      });
      
      return false; // No damage during dash
    }
    
    const anim = this.sprite.anims;
    // Check if currently in swing animation (any frame) or holding on last frame OR have active attack hitbox
    const isInSwingAnimation = (anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim") || this.isHoldingSwingFrame || !!this.hitboxes.attackHitbox;
    // Check if currently in attack animation on first frame  
    const isInAttackAnimationFirstFrame = anim.isPlaying && anim.currentAnim?.key === "kilboy_swing_anim" && anim.currentFrame?.index === 1;
    
    // Special case: Attack destruction (first frame + upward movement)
    if (isInAttackAnimationFirstFrame && this.sprite && this.sprite.body && (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y < 0) {
      // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
      (brownHitbox as any).canDamage = false;
      // Activate global hitstop cooldown
      this.hitstopCooldownActive = true;
      this.scene.time.delayedCall(1500, () => {
        this.hitstopCooldownActive = false;
      });
      
      // Apply gravity to the individual brown hitbox (attack destruction)
      const hitbox = brownHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        // Move to falling group to prevent collision with player
        (this.scene as any).floatingPipeManager.brownHitboxes.remove(hitbox);
        (this.scene as any).floatingPipeManager.fallingBrownHitboxes.add(hitbox);
        
        hitbox.body.moves = true; // Re-enable individual movement for destruction
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800); // Stronger gravity
        // Randomize velocity for more varied destruction effect
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
      }
      // Start fading immediately when velocity is applied
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: 1000,
        ease: 'Linear',
      });
      return false; // No damage during attack destruction
    }
    
    // If swinging (any frame) or have active attack hitbox, immune to damage
    if (isInSwingAnimation) {
      return false; // No damage during swing animation
    }
    
    // Brown cubes provide direct damage when touched
    
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
    this.hitboxes.updateHitboxPositions();
  }

  // Sync upper hitbox to follow the sprite's upper half
  public syncUpperHitbox(): void {
    this.hitboxes.syncUpperHitbox();
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
      if (this.hitboxes.attackHitbox) {
        if ((this.scene as any).hitStop) {
          (this.scene as any).hitStop.unregister(this.hitboxes.attackHitbox);
        }
        this.hitboxes.attackHitbox.destroy();
        this.hitboxes.attackHitbox = undefined;

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
    const floatingPipeManager = (this.scene as any).floatingPipeManager;
    let found = false;
    // Check upper pipes
    if (upperPipeManager && upperPipeManager.pipes) {
      upperPipeManager.pipes.getChildren().forEach((pipe: any) => {
        const upperPipe = pipe as Phaser.GameObjects.Container;
        if (upperPipe && (upperPipe as any).purpleHitboxes) {
          const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
          if (pipeHitboxes.includes(hitPurpleCube)) {
            pipeHitboxes.forEach((cube: any) => {
              cube.canDamage = false;
            });
            found = true;
            return;
          }
        }
      });
    }
    // Check floating pipes if not found in upper pipes
    if (!found && floatingPipeManager && floatingPipeManager.pipes) {
      floatingPipeManager.pipes.getChildren().forEach((pipe: any) => {
        const floatingPipe = pipe as Phaser.GameObjects.Container;
        if (floatingPipe && (floatingPipe as any).purpleHitboxes) {
          const pipeHitboxes = (floatingPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
          if (pipeHitboxes.includes(hitPurpleCube)) {
            pipeHitboxes.forEach((cube: any) => {
              cube.canDamage = false;
            });
            return;
          }
        }
      });
    }
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
    if (upperPipeManager && upperPipeManager.purpleHitboxes) {
      const playerBounds = this.sprite.getBounds();
      upperPipeManager.purpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
        if (!purpleHitbox.active || (purpleHitbox as any).canDamage === false) return;
        const purpleBounds = purpleHitbox.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, purpleBounds)) {
          this.lastPurpleCubeHitTime = this.scene.time.now;
          (purpleHitbox as any).canDamage = false;
          this.disableAllPurpleCubesInPipe(purpleHitbox);
          if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
            upperPipeManager.purpleHitboxes.remove(purpleHitbox);
            upperPipeManager.fallingPurpleHitboxes.add(purpleHitbox);
            purpleHitbox.body.setAllowGravity(true);
            purpleHitbox.body.setGravityY(800);
            const randomX = Phaser.Math.Between(70, 110);
            const randomY = Phaser.Math.Between(-170, -130);
            purpleHitbox.body.setVelocity(randomX, randomY);
            this.scene.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
              duration: PipeManager.PURPLE_CUBE_FADE_DURATION,
              ease: 'Linear',
            });
          }
          upperPipeManager.triggerFallForHitboxesBelow(purpleHitbox, false, false);
        }
      });
    }
    // Now add continuous cutting for floating pipe purple cubes
    const floatingPipeManager = (this.scene as any).floatingPipeManager;
    if (floatingPipeManager && floatingPipeManager.floatingPurpleHitboxes) {
      // Prevent cutting if Kilboy's upperHitbox is overlapping any floating pipe blue hitbox
      let isOverlappingBlue = false;
      if (this.hitboxes.upperHitbox && floatingPipeManager.blueHitboxes) {
        floatingPipeManager.blueHitboxes.getChildren().forEach((blue: any) => {
          if (this.hitboxes.upperHitbox && this.scene.physics.overlap(this.hitboxes.upperHitbox, blue)) {
            isOverlappingBlue = true;
          }
        });
      }
      if (isOverlappingBlue) {
        // Prevent all cutting if upperHitbox is overlapping blue box
        return;
      }
      const playerBounds = this.sprite.getBounds();
      floatingPipeManager.floatingPurpleHitboxes.getChildren().forEach((purpleHitbox: any) => {
        if (!purpleHitbox.active || (purpleHitbox as any).canDamage === false) return;
        const purpleBounds = purpleHitbox.getBounds();
        if (Phaser.Geom.Rectangle.Overlaps(playerBounds, purpleBounds)) {
          this.lastPurpleCubeHitTime = this.scene.time.now;
          (purpleHitbox as any).canDamage = false;
          this.disableAllPurpleCubesInPipe(purpleHitbox);
          if (purpleHitbox.body && purpleHitbox.body instanceof Phaser.Physics.Arcade.Body) {
            floatingPipeManager.floatingPurpleHitboxes.remove(purpleHitbox);
            // Optionally add to a falling group if you want to track falling cubes
            floatingPipeManager.fallingPurpleHitboxes.add(purpleHitbox);
            purpleHitbox.body.setAllowGravity(true);
            purpleHitbox.body.setGravityY(800);
            const randomX = Phaser.Math.Between(70, 110);
            const randomY = Phaser.Math.Between(-170, -130);
            purpleHitbox.body.setVelocity(randomX, randomY);
            this.scene.tweens.add({
              targets: purpleHitbox,
              alpha: 0,
              duration: 1000,
              ease: 'Linear',
            });
          }
          floatingPipeManager.triggerFallForHitboxesBelow(purpleHitbox, false, false);
        }
      });
    }
  }



  // Dash state: disables jump, sets x velocity to +50, tweens back to 0 over 100ms, then re-enables jump
  private startDash() {
    if (this.isDashing) return;
    // Award 100 points for triggering dash, only when a new dash starts
    if (this.scene && typeof (this.scene as any).increaseScore === 'function') {
      (this.scene as any).increaseScore(1000);
    }
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