import Phaser from "phaser";

export default class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private invincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;
  private health: number = 4;
  private invincibleTimeout?: Phaser.Time.TimerEvent;
  private attackHitbox?: Phaser.GameObjects.Arc;
  private attackHitboxTimer?: Phaser.Time.TimerEvent;
  private attackCompletionHitbox?: Phaser.GameObjects.Arc;
  private attackCompletionTimer?: Phaser.Time.TimerEvent;
  public canFlap: boolean = true;
  // Add separate hitboxes for upper and lower body
  public upperHitbox?: Phaser.GameObjects.Rectangle;
  public lowerHitbox?: Phaser.GameObjects.Rectangle;
  
  // Attack hitbox configuration - easily adjustable
  private static readonly ATTACK_RADIUS = 44; // Radius of the attack hitbox (10% bigger)
  private static readonly ATTACK_OFFSET_X = 45; // How far to the right of Kilboy
  private static readonly ATTACK_OFFSET_Y = -10; // Vertical offset from Kilboy's center

  private hitstopTriggeredThisSwing: boolean = false;
  private hitstopTriggered: boolean = false;
  private animationUpdateHandler?: Function;
  private isDashing: boolean = false;
  private dashTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, startPosition: { x: number, y: number }) {
    this.scene = scene;
    this.sprite = this.scene.physics.add
      .sprite(startPosition.x, startPosition.y, "kilboy")
      .setOrigin(0)
      .setDepth(1);
    // Create swing animation (non-looping, holds on last frame)
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
    this.scene.physics.world.setBounds(15, 0, this.scene.sys.game.config.width as number - 15, this.scene.sys.game.config.height as number);

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
  }

  flap(initialFlapVelocity: number): boolean {
    if (!this.canFlap) return false;
    if (this.invincible) return false;
    if (this.isDashing) return false;
    // Reset hitstopTriggered if jumpCount is 0
    if ((this.scene as any).jumpCount !== undefined && (this.scene as any).jumpCount === 0) {
      this.hitstopTriggered = false;
    }
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y = -initialFlapVelocity;
    }
    // Play swing animation (non-looping, holds on last frame)
    this.sprite.anims.play("kilboy_swing_anim", true);

    // Reset hitstop flag for this swing
    this.hitstopTriggeredThisSwing = false;

    // Listen for animation frame update to destroy the first hitbox after the first frame
    if (this.animationUpdateHandler) {
      this.sprite.off('animationupdate', this.animationUpdateHandler as any);
    }
    this.animationUpdateHandler = (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      if (anim.key === 'kilboy_swing_anim' && frame.index > 1) {
        // After the first frame, destroy the first hitbox if it exists
        if (this.attackHitbox) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.attackHitbox);
          }
          this.attackHitbox.destroy();
          this.attackHitbox = undefined;
        }
        // If hitstop was NOT triggered, create the second hitbox immediately
        if (!this.hitstopTriggeredThisSwing) {
          this.createAttackCompletionHitbox();
        }
        // Remove this handler for future swings
        this.sprite.off('animationupdate', this.animationUpdateHandler as any);
      }
    };
    this.sprite.on('animationupdate', this.animationUpdateHandler as any);

    // Create attack hitbox to the right of Kilboy
    this.createAttackHitbox();
    return true;
  }

  private createAttackHitbox() {
    // Clean up existing attack hitboxes if they exist
    if (this.attackHitbox) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.attackHitbox);
      }
      this.attackHitbox.destroy();
      this.attackHitbox = undefined;
    }
    if (this.attackCompletionHitbox) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.attackCompletionHitbox);
      }
      this.attackCompletionHitbox.destroy();
      this.attackCompletionHitbox = undefined;
    }
    if (this.attackHitboxTimer) {
      this.attackHitboxTimer.remove();
      this.attackHitboxTimer = undefined;
    }
    if (this.attackCompletionTimer) {
      this.attackCompletionTimer.remove();
      this.attackCompletionTimer = undefined;
    }
    
    // Use fixed values for attack hitbox size and position
    // First hitbox: move 5px left and 3px up
    const attackX = this.sprite.x + Player.ATTACK_OFFSET_X - 5;
    const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y - 3;
    
    // Create first hitbox for collision detection (20% smaller)
    const firstHitboxRadius = Player.ATTACK_RADIUS * 0.8;
    this.attackHitbox = this.scene.add.circle(attackX, attackY, firstHitboxRadius, 0xff0000, 0.3);
    this.scene.physics.add.existing(this.attackHitbox);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setCircle(firstHitboxRadius);
    this.attackHitbox.setAlpha(0);
    
    // Register first hitbox with hitStop
    if ((this.scene as any).hitStop) {
      (this.scene as any).hitStop.register(this.attackHitbox);
    }
    
    // Set up overlap with purple cubes for the first hitbox
    this.scene.physics.add.overlap(
      this.attackHitbox!,
      (this.scene as any).pipeManager?.purpleHitboxes,
      (attack: any, purple: any) => {
        // On collision, trigger hitstop and destroy the first hitbox immediately
        if ((this.scene as any).hitStop && !this.hitstopTriggered) {
          this.canFlap = false;
          this.hitstopTriggeredThisSwing = true;
          this.hitstopTriggered = true;
          (this.scene as any).hitStop.trigger(200, () => {
            // Start Dash after hitstop ends
            this.startDash();
          });
        }
        if (this.attackHitbox) {
          if ((this.scene as any).hitStop) {
            (this.scene as any).hitStop.unregister(this.attackHitbox);
          }
          this.attackHitbox.destroy();
          this.attackHitbox = undefined;
        }
        // Remove animation update handler so it doesn't create the second hitbox
        if (this.animationUpdateHandler) {
          this.sprite.off('animationupdate', this.animationUpdateHandler as any);
        }
      },
      undefined,
      this
    );
  }

  private createAttackCompletionHitbox() {
    // Clean up existing completion hitbox if it exists
    if (this.attackCompletionHitbox) {
      if ((this.scene as any).hitStop) {
        (this.scene as any).hitStop.unregister(this.attackCompletionHitbox);
      }
      this.attackCompletionHitbox.destroy();
      this.attackCompletionHitbox = undefined;
    }
    if (this.attackCompletionTimer) {
      this.attackCompletionTimer.remove();
      this.attackCompletionTimer = undefined;
    }
    // Use fixed values for attack hitbox size and position
    const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
    const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
    // Create second hitbox for attack completion
    this.attackCompletionHitbox = this.scene.add.circle(attackX, attackY, Player.ATTACK_RADIUS, 0x00ff00, 0.3);
    this.scene.physics.add.existing(this.attackCompletionHitbox);
    (this.attackCompletionHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackCompletionHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.attackCompletionHitbox.body as Phaser.Physics.Arcade.Body).setCircle(Player.ATTACK_RADIUS);
    this.attackCompletionHitbox.setAlpha(0); // Fully invisible
    // Do NOT register second hitbox with hitStop
    // Set up overlap with purple cubes for the second hitbox (push effect, no hitstop)
    this.scene.physics.add.overlap(
      this.attackCompletionHitbox!,
      (this.scene as any).pipeManager?.purpleHitboxes,
      (attack: any, purple: any) => {
        // Simulate Kilboy's upward hit on purple cube (push effect)
        purple.canDamage = false;
        if (purple.body && purple.body instanceof Phaser.Physics.Arcade.Body) {
          purple.body.setAllowGravity(true);
          purple.body.setGravityY(800);
          const randomX = Phaser.Math.Between(70, 110);
          const randomY = Phaser.Math.Between(-170, -130);
          purple.body.setVelocity(randomX, randomY);
        }
        this.scene.tweens.add({
          targets: purple,
          alpha: 0,
          duration: 1000,
          ease: 'Linear',
        });
        (this.scene as any).pipeManager.triggerFallForHitboxesBelow(purple, false);
      },
      undefined,
      this
    );
    // Timer for the second hitbox (attack completion) - short duration
    this.attackCompletionTimer = this.scene.time.delayedCall(300, () => {
      if (this.attackCompletionHitbox) {
        if ((this.scene as any).hitStop) {
          (this.scene as any).hitStop.unregister(this.attackCompletionHitbox);
        }
        this.attackCompletionHitbox.destroy();
        this.attackCompletionHitbox = undefined;
      }
    });
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
    // Prevent damage while dashing
    if (this.isDashing) {
      return false;
    }
    
    const anim = this.sprite.anims;
    // Only proceed if animation is playing and on the first frame of kilboy_swing_anim
    if (
      !anim.isPlaying ||
      anim.currentAnim?.key !== "kilboy_swing_anim" ||
      anim.currentFrame?.index !== 1
    ) {
      return false;
    }
    if (
      anim.isPlaying &&
      anim.currentAnim?.key === "kilboy_swing_anim"
    ) {
      (this.scene as any).hitStop?.trigger(1000);
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
    // Only allow damage if canDamage is not false
    if ((purpleHitbox as any).canDamage === false) return false;
    // Always trigger fall for hitboxes below
    pipeManager.triggerFallForHitboxesBelow(purpleHitbox as Phaser.GameObjects.Rectangle, isGameOver);
    // Check if player is jumping upward (negative Y velocity)
    if (this.sprite && this.sprite.body && (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y < 0) {
      // Apply gravity to the individual purple hitbox
      const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.setAllowGravity(true);
        hitbox.body.setGravityY(800); // Stronger gravity (was 400)
        // Randomize velocity for more varied destruction effect
        const randomX = Phaser.Math.Between(-100, 100);
        const randomY = Phaser.Math.Between(-150, -25);
        hitbox.body.setVelocity(randomX, randomY);
        // Removed setDragX since it wasn't working as expected
      }
      // Fade out the hitbox over 1000ms
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: 1000, // Increased from 300ms to 1000ms
        ease: 'Linear',
      });
      return false; // No damage
    }
    // Not moving upward: trigger damage and stop velocity
    this.stopVelocityOnDamage();
    return true;
  }

  // Stop velocity when taking damage from purple hitboxes
  private stopVelocityOnDamage() {
    if (this.sprite && this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(0);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
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
    if (this.attackHitbox && this.sprite) {
      const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
      const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
      this.attackHitbox.setPosition(attackX, attackY);
    }
    if (this.attackCompletionHitbox && this.sprite) {
      const attackX = this.sprite.x + Player.ATTACK_OFFSET_X;
      const attackY = this.sprite.y + this.sprite.height / 2 + Player.ATTACK_OFFSET_Y;
      this.attackCompletionHitbox.setPosition(attackX, attackY);
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

  // Dash state: disables jump, sets x velocity to +50, tweens back to 0 over 100ms, then re-enables jump
  private startDash() {
    if (this.isDashing) return;
    console.log('[Player] Dash started');
    this.isDashing = true;
    this.canFlap = false;
    if (this.dashTween) this.dashTween.stop();
    const dashBody = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (dashBody) {
      console.log('[Player] Before dash - x velocity:', dashBody.velocity.x, 'x position:', this.sprite.x);
      dashBody.setVelocityX(1000);
      dashBody.setVelocityY(0);
      console.log('[Player] After setVelocityX(500) - x velocity:', dashBody.velocity.x);
      let current = { v: 1000 };
      this.dashTween = this.scene.tweens.add({
        targets: current,
        v: 0,
        duration: 500,
        ease: 'Linear',
        onUpdate: () => {
          dashBody.setVelocityX(current.v);
          dashBody.setVelocityY(0);
          console.log('[Player] Dash onUpdate - setting x velocity to:', current.v, 'actual velocity:', dashBody.velocity.x, 'position:', this.sprite.x);
        },
        onComplete: () => {
          dashBody.setVelocityX(0);
          this.isDashing = false;
          this.canFlap = true;
          console.log('[Player] Dash ended - final position:', this.sprite.x);
        }
      });
    } else {
      console.log('[Player] ERROR: dashBody is null/undefined!');
    }
  }
} 