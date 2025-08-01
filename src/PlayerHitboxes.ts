import Phaser from "phaser";
import PipeManager from "./scenes/PipeManager";

export default class PlayerHitboxes {
  private scene: Phaser.Scene;
  private player: any; // Reference to the player for positioning
  
  // Hitbox properties
  public hitStopCheck?: Phaser.GameObjects.Arc;
  public attackHitbox?: Phaser.GameObjects.Arc;
  public lookAheadHitbox?: Phaser.GameObjects.Rectangle;
  public upperHitbox?: Phaser.GameObjects.Rectangle;
  
  // Attack hitbox configuration - easily adjustable
  private static readonly ATTACK_RADIUS = 44; // Radius of the attack hitbox (10% bigger)
  private static readonly ATTACK_OFFSET_X = 45; // How far to the right of Kilboy
  private static readonly ATTACK_OFFSET_Y = -20; // Vertical offset from Kilboy's center
  
  // Hitstop hitbox configuration
  private static readonly HITSTOP_RADIUS = 26; // Radius of the hitstop check hitbox (smaller than attack)
  private static readonly HITSTOP_OFFSET_X = 40; // How far to the right of Kilboy (5px left of attack)
  private static readonly HITSTOP_OFFSET_Y = -13; // Vertical offset from Kilboy's center (3px up from attack)

  constructor(scene: Phaser.Scene, player: any) {
    this.scene = scene;
    this.player = player;
    
    // Create upper hitbox for blue box collisions (sensor only)
    this.createUpperHitbox();
    
    // Create permanent look ahead hitbox (always active)
    this.createLookAheadHitbox();
  }

  private createUpperHitbox() {
    const sprite = this.player.sprite;
    const hitboxWidth = sprite.width * 0.5;
    const hitboxHeight = 26; // Split height in half
    
    // Upper hitbox for blue box collisions (sensor only)
    this.upperHitbox = this.scene.add.rectangle(sprite.x, sprite.y, hitboxWidth, hitboxHeight, 0x0000ff, 0.3);
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
  }

  private createLookAheadHitbox() {
    const sprite = this.player.sprite;
    
    // Create a rectangular hitbox that extends forward from Kilboy to detect purple cubes ahead
    const lookAheadWidth = 24; // How far ahead to detect (80% smaller: 120 * 0.2)
    const lookAheadHeight = (46); // 80% smaller
    const lookAheadX = sprite.x + 78; // Start from Kilboy's right edge
    const lookAheadY = -500; // Center vertically
    
    this.lookAheadHitbox = this.scene.add.rectangle(lookAheadX, lookAheadY, lookAheadWidth, lookAheadHeight, 0xffff00, 0.2);
    this.lookAheadHitbox.setOrigin(0, 0);
    this.scene.physics.add.existing(this.lookAheadHitbox);
    (this.lookAheadHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.lookAheadHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    this.lookAheadHitbox.setAlpha(0); // Invisible for production
    
    // Collision detection will be set up in PlayScene's createColiders() method
  }

  public createHitStopCheckHitbox() {
    const sprite = this.player.sprite;
    
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

    // Use fixed values for hitstop hitbox size and position
    const hitstopX = sprite.x + PlayerHitboxes.HITSTOP_OFFSET_X;
    const hitstopY = sprite.y + 26 + PlayerHitboxes.HITSTOP_OFFSET_Y;
    
    // Create hitStopCheck hitbox for collision detection
    this.hitStopCheck = this.scene.add.circle(hitstopX, hitstopY, PlayerHitboxes.HITSTOP_RADIUS, 0xff0000, 0.3);
    this.scene.physics.add.existing(this.hitStopCheck);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.hitStopCheck.body as Phaser.Physics.Arcade.Body).setCircle(PlayerHitboxes.HITSTOP_RADIUS);
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
        if (this.player.hitstopCooldownActive) return;
        
        // Update last purple cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
        
        // Disable all purple cubes in the same pipe when any cube is hit
        this.player.disableAllPurpleCubesInPipe(purple);
        
        // On collision, trigger hitstop and destroy the hitStopCheck hitbox immediately
        // Only trigger hitstop when jump count is 0 (first swing)
        if ((this.scene as any).hitStop && !this.player.hitstopTriggered && (this.scene as any).jumpCount === 1) {
          this.player.canFlap = false;
          this.player.hitstopTriggeredThisSwing = true;
          this.player.hitstopTriggered = true;
          // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
          purple.canDamage = false;
          // Activate global hitstop cooldown
          this.player.hitstopCooldownActive = true;
          this.scene.time.delayedCall(1000, () => {
            this.player.hitstopCooldownActive = false;
          });
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.player.startDash();
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
        if (this.player.animationUpdateHandler) {
          this.player.sprite.off('animationupdate', this.player.animationUpdateHandler as any);
        }
      },
      undefined,
      this
    );

    // Set up overlap with floating pipe purple cubes for the hitStopCheck hitbox
    this.scene.physics.add.overlap(
      this.hitStopCheck!,
      (this.scene as any).floatingPipeManager?.floatingPurpleHitboxes,
      (attack: any, purple: any) => {
        // Only trigger hitstop and dash if the purple cube can still damage
        if (purple.canDamage === false) return;
        // Check global hitstop cooldown
        if (this.player.hitstopCooldownActive) return;
        // Update last purple cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
        // Disable all purple cubes in the same pipe
        this.player.disableAllPurpleCubesInPipe(purple);
        // On collision, trigger hitstop and destroy the hitStopCheck hitbox immediately
        // Only trigger hitstop when jump count is 0 (first swing)
        if ((this.scene as any).hitStop && !this.player.hitstopTriggered && (this.scene as any).jumpCount === 1) {
          this.player.canFlap = false;
          this.player.hitstopTriggeredThisSwing = true;
          this.player.hitstopTriggered = true;
          // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
          purple.canDamage = false;
          // Activate global hitstop cooldown
          this.player.hitstopCooldownActive = true;
          this.scene.time.delayedCall(1000, () => {
            this.player.hitstopCooldownActive = false;
          });
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.player.startDash();
          });
        }
        if (this.hitStopCheck) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.hitStopCheck);
          }
          this.hitStopCheck.destroy();
          this.hitStopCheck = undefined;
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
        if (this.player.hitstopCooldownActive) return;
        
        // Update last maroon cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
        
        // Disable all maroon cubes in the same pipe when any cube is hit
        this.player.disableAllMaroonCubesInPipe(maroon);
        
        // Trigger fall for maroon cubes above the hit cube
        (this.scene as any).lowerPipeManager.triggerFallForHitboxesAbove(maroon, false, false);
        
        // On collision, trigger hitstop and destroy the hitStopCheck hitbox immediately
        // Only trigger hitstop when jump count is 0 (first swing)
        if ((this.scene as any).hitStop && !this.player.hitstopTriggered && (this.scene as any).jumpCount === 1) {
          this.player.canFlap = false;
          this.player.hitstopTriggeredThisSwing = true;
          this.player.hitstopTriggered = true;
          // Immediately mark this cube as unable to damage to prevent multiple hitstop triggers
          maroon.canDamage = false;
          // Activate global hitstop cooldown
          this.player.hitstopCooldownActive = true;
          this.scene.time.delayedCall(1000, () => {
            this.player.hitstopCooldownActive = false;
          });
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.player.startDash();
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
        if (this.player.animationUpdateHandler) {
          this.player.sprite.off('animationupdate', this.player.animationUpdateHandler as any);
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

  public createAttackHitbox() {
    const sprite = this.player.sprite;
    
    // Prevent attack hitbox if upperHitbox is overlapping any blue hitbox (both floating and upper pipes)
    const floatingPipeManager = (this.scene as any).floatingPipeManager;
    const upperPipeManager = (this.scene as any).upperPipeManager;
    
    if (this.upperHitbox) {
      let isOverlappingBlue = false;
      
      // Check floating pipe blue hitboxes
      if (floatingPipeManager && floatingPipeManager.blueHitboxes) {
        floatingPipeManager.blueHitboxes.getChildren().forEach((blue: any) => {
          if (this.upperHitbox && this.scene.physics.overlap(this.upperHitbox, blue)) {
            isOverlappingBlue = true;
          }
        });
      }
      
      // Check upper pipe blue hitboxes
      if (upperPipeManager && upperPipeManager.blueHitboxes) {
        upperPipeManager.blueHitboxes.getChildren().forEach((blue: any) => {
          if (this.upperHitbox && this.scene.physics.overlap(this.upperHitbox, blue)) {
            isOverlappingBlue = true;
          }
        });
      }
      
      if (isOverlappingBlue) {
        return; // Do not create attack hitbox if upperHitbox is overlapping blue
      }
    }
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
    const attackX =  PlayerHitboxes.ATTACK_OFFSET_X;
    const attackY = PlayerHitboxes.ATTACK_OFFSET_Y;
    // Create attack hitbox
    this.attackHitbox = this.scene.add.circle(attackX, attackY, PlayerHitboxes.ATTACK_RADIUS, 0x00ff00, 0.3);
    this.scene.physics.add.existing(this.attackHitbox);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setCircle(PlayerHitboxes.ATTACK_RADIUS);
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
          (this.scene as any).pipeCutHitStop.trigger();
        }
        // Simulate Kilboy's upward hit on purple cube (push effect)
        purple.canDamage = false;
        // Disable all purple cubes in the same pipe
        this.player.disableAllPurpleCubesInPipe(purple);
        // Update last purple cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
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

    // Set up overlap with floating pipe purple cubes for the attack hitbox
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).floatingPipeManager?.floatingPurpleHitboxes,
      (attack: any, purple: any) => {
        // Only trigger pipe cut hitstop if the purple cube is fully opaque (not fading)
        if ((this.scene as any).pipeCutHitStop && purple.alpha >= 1) {
          (this.scene as any).pipeCutHitStop.trigger();
        }
        // Simulate Kilboy's upward hit on purple cube (push effect)
        purple.canDamage = false;
        // Disable all purple cubes in the same pipe
        this.player.disableAllPurpleCubesInPipe(purple);
        // Update last purple cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
        if (purple.body && purple.body instanceof Phaser.Physics.Arcade.Body) {
          // Move to falling group to prevent collision with player
          (this.scene as any).floatingPipeManager.floatingPurpleHitboxes.remove(purple);
          // Optionally add to a falling group if you want to track falling cubes
          (this.scene as any).floatingPipeManager.fallingPurpleHitboxes.add(purple);
          purple.body.setAllowGravity(true);
          purple.body.setGravityY(800);
          const randomX = Phaser.Math.Between(70, 110);
          const randomY = Phaser.Math.Between(-170, -130);
          purple.body.setVelocity(randomX, randomY);
          // Start fading immediately when X velocity is applied
          this.scene.tweens.add({
            targets: purple,
            alpha: 0,
            duration: 1000,
            ease: 'Linear',
          });
        }
        (this.scene as any).floatingPipeManager.triggerFallForHitboxesBelow(purple, false, false);
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
        this.player.disableAllMaroonCubesInPipe(maroon);
        // Update last maroon cube hit timestamp
        this.player.lastPurpleCubeHitTime = this.scene.time.now;
        if (maroon.body && maroon.body instanceof Phaser.Physics.Arcade.Body) {
          // Move to falling group to prevent collision with player
          (this.scene as any).lowerPipeManager.maroonHitboxes.remove(maroon);
          (this.scene as any).lowerPipeManager.fallingMaroonHitboxes.add(maroon);
          
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

  // Update hitbox positions to follow the player sprite
  public updateHitboxPositions() {
    const sprite = this.player.sprite;
    
    if (this.hitStopCheck && sprite) {
      const attackX = sprite.x + PlayerHitboxes.ATTACK_OFFSET_X;
      const attackY = sprite.y + 26 + PlayerHitboxes.ATTACK_OFFSET_Y;
      this.hitStopCheck.setPosition(attackX, attackY);
    }
    if (this.attackHitbox && sprite) {
      const attackX = sprite.x + PlayerHitboxes.ATTACK_OFFSET_X;
      const attackY = sprite.y + 26 + PlayerHitboxes.ATTACK_OFFSET_Y;
      this.attackHitbox.setPosition(attackX, attackY);
    }
    if (this.lookAheadHitbox && sprite) {
      const lookAheadX = sprite.x + sprite.width;
      const lookAheadY = sprite.y + (26) - (this.lookAheadHitbox.height / 2);
      this.lookAheadHitbox.setPosition(lookAheadX, lookAheadY);
    }
  }

  // Sync upper hitbox to follow the sprite's upper half
  public syncUpperHitbox(): void {
    const sprite = this.player.sprite;
    if (this.upperHitbox && sprite.body) {
      const spriteBody = sprite.body as Phaser.Physics.Arcade.Body;
      const spriteWidth = spriteBody.width;
      const spriteOffsetX = spriteBody.offset.x;
      const spriteOffsetY = spriteBody.offset.y;
      
      // Calculate the exact position relative to the sprite's world position
      const worldX = sprite.x + spriteOffsetX + spriteWidth / 2;
      const worldY = sprite.y + spriteOffsetY - spriteBody.height / 2;
      
      // Set position directly without any additional calculations
      this.upperHitbox.setPosition(worldX, worldY);
    }
  }

  // Clean up all hitboxes
  public destroy() {
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
    if (this.lookAheadHitbox) {
      this.lookAheadHitbox.destroy();
      this.lookAheadHitbox = undefined;
    }
    if (this.upperHitbox) {
      this.upperHitbox.destroy();
      this.upperHitbox = undefined;
    }
  }
} 