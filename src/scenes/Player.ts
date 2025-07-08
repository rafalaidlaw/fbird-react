import Phaser from "phaser";

export default class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private invincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;
  private health: number = 4;
  private invincibleTimeout?: Phaser.Time.TimerEvent;
  private attackHitbox?: Phaser.GameObjects.Rectangle;
  private attackHitboxTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, startPosition: { x: number, y: number }) {
    this.scene = scene;
    this.sprite = this.scene.physics.add
      .sprite(startPosition.x, startPosition.y, "kilboy")
      .setOrigin(0)
      .setDepth(1);
    // Set hitbox size to 70% of sprite width, height - 8 as before, and offset 5px to the left
    this.sprite.setBodySize(this.sprite.width * 0.5, this.sprite.height - 8, false);
    if (this.sprite.body) {
      this.sprite.body.setOffset(6, 0);
    }
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).gravity.y = 400;
    }
    this.sprite.setCollideWorldBounds(true);
    // Set world bounds to start 15 pixels from the left edge
    this.scene.physics.world.setBounds(15, 0, this.scene.sys.game.config.width as number - 15, this.scene.sys.game.config.height as number);
    if (this.sprite.body && this.sprite.body instanceof Phaser.Physics.Arcade.Body) {
      this.sprite.body.setBounce(0, 1);
      this.sprite.body.setDragX(0);
      this.sprite.body.setMaxVelocity(0, 800);
      this.sprite.body.pushable = false;
    }
  }

  flap(initialFlapVelocity: number) {
    if (this.invincible) return;
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y = -initialFlapVelocity;
    }
    this.sprite.setTexture("kilboy2");

    // Create attack hitbox to the right of Kilboy
    if (this.attackHitbox) {
      this.attackHitbox.destroy();
      this.attackHitbox = undefined;
    }
    if (this.attackHitboxTimer) {
      this.attackHitboxTimer.remove();
      this.attackHitboxTimer = undefined;
    }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const hitboxWidth = body.width;
    const hitboxHeight = body.height;
    const attackWidth = 40; // Doubled from 20
    const attackHeight = hitboxHeight * 2; // 1/3 taller
    const attackX = this.sprite.x + body.offset.x + hitboxWidth + 100 + 20;
    const attackY = this.sprite.y + body.offset.y - (attackHeight - hitboxHeight) / 2;
    this.attackHitbox = this.scene.add.rectangle(attackX, attackY, attackWidth, attackHeight, 0xff0000, 0.3);
    this.scene.physics.add.existing(this.attackHitbox);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // Set up overlap with purple cubes
    this.scene.physics.add.overlap(
      this.attackHitbox,
      (this.scene as any).pipeManager?.purpleHitboxes,
      (attack: any, purple: any) => {
        // Simulate Kilboy's upward hit on purple cube
        this.handlePurpleHitboxCollision(purple, (this.scene as any).pipeManager, false);
      },
      undefined,
      this
    );
    // Remove attack hitbox after 200ms
    this.attackHitboxTimer = this.scene.time.delayedCall(200, () => {
      if (this.attackHitbox) {
        this.attackHitbox.destroy();
        this.attackHitbox = undefined;
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
    // Check if player is jumping upward (negative Y velocity)
    if (this.sprite && this.sprite.body && (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y < 0) {
      // Apply gravity to the individual purple hitbox
      const hitbox = purpleHitbox as Phaser.GameObjects.Rectangle;
      if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
        hitbox.body.setGravityY(400); // Same gravity as player
      }
      // Fade out the hitbox over 300ms
      this.scene.tweens.add({
        targets: hitbox,
        alpha: 0,
        duration: 300,
        ease: 'Linear',
      });
      // Find and trigger fall for hitboxes below this one
      this.triggerFallForHitboxesBelow(hitbox, pipeManager, isGameOver);
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

  // Triggers fall for hitboxes below the one hit
  public triggerFallForHitboxesBelow(hitHitbox: Phaser.GameObjects.Rectangle, pipeManager: any, isGameOver: boolean) {
    this.scene.time.delayedCall(50, () => {
      if (pipeManager.pipes) {
        pipeManager.pipes.getChildren().forEach((pipe: any) => {
          const upperPipe = pipe as Phaser.Physics.Arcade.Sprite;
          if (upperPipe && (upperPipe as any).purpleHitboxes) {
            const pipeHitboxes = (upperPipe as any).purpleHitboxes as Phaser.GameObjects.Rectangle[];
            const hitIndex = pipeHitboxes.indexOf(hitHitbox);
            if (hitIndex !== -1) {
              const hitRow = Math.floor(hitIndex / 5);
              const hitCol = hitIndex % 5;
              pipeHitboxes.forEach((hitbox, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                if (col === hitCol && row > hitRow) {
                  if (hitbox.body && hitbox.body instanceof Phaser.Physics.Arcade.Body) {
                    hitbox.body.setGravityY(400);
                  }
                  this.scene.tweens.add({
                    targets: hitbox,
                    alpha: 0,
                    duration: 500,
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
                  if (!isGameOver) {
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
                  if (!isGameOver) {
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
      }
    });
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
    if (this.attackHitbox && this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      const hitboxWidth = body.width;
      const hitboxHeight = body.height;
      const attackWidth = 40; // Doubled from 20
      const attackHeight = hitboxHeight * 4 / 3;
      const attackX = this.sprite.x + body.offset.x + hitboxWidth + 20 +30;
      const attackY = this.sprite.y + body.offset.y - (attackHeight - hitboxHeight) / 2;
      this.attackHitbox.setPosition(attackX, attackY);
    }
  }
} 