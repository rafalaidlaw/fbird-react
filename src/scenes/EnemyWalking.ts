import Phaser from "phaser";

export default class EnemyWalking {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private moveSpeed: number = 50; // Slower speed for platform walking
  private moveDirection: number = 1; // 1 for right, -1 for left
  private platformWidth: number = 0; // Will be set based on the platform
  private platformLeftEdge: number = 0; // Left edge of the platform
  private platformRightEdge: number = 0; // Right edge of the platform
  private health: number = 3;
  private isDead: boolean = false;
  private isAttacking: boolean = false;
  private attackCooldown: number = 1000; // 1 second
  private lastAttackTime: number = 0;
  private canDamagePlayer: boolean = true; // Whether this enemy can still damage the player

  constructor(scene: Phaser.Scene, x: number, y: number, platformWidth: number = 64) {
    this.scene = scene;
    this.platformWidth = platformWidth;
    this.platformLeftEdge = x - platformWidth / 2;
    this.platformRightEdge = x + platformWidth / 2;
    
    // Create enemy using the 'enemy_met' texture
    this.sprite = this.scene.physics.add.sprite(x, y, 'enemy_met');
    this.sprite.setDisplaySize(25, 25); // Set display size to 25x25
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.clearTint(); // Ensure no tint is applied
    
    // Setup physics - no gravity, follows platform
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(0); // No gravity
      (this.sprite.body as Phaser.Physics.Arcade.Body).setBounce(0, 0);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false); // Don't collide with world bounds
      (this.sprite.body as Phaser.Physics.Arcade.Body).setImmovable(false);
      (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(25, 25); // Set collision size to 25x25
    }
    
    // Set velocity to match platform movement (-200)
    this.sprite.setVelocityX(-200);
  }

  update(): void {
    if (this.isDead) return;

    // Keep enemy moving with platform velocity
    if (this.sprite.body && this.sprite.body.velocity.x !== -200) {
      this.sprite.setVelocityX(-200);
    }
    
    // Check if enemy should attack
    this.checkForAttack();
  }

  private handlePatrol(): void {
    if (!this.sprite.body) return;

    const currentX = this.sprite.x;

    // Change direction at platform edges
    if (currentX <= this.platformLeftEdge + 8 && this.moveDirection === -1) {
      this.moveDirection = 1;
      this.sprite.setVelocityX(this.moveSpeed);
      this.sprite.setFlipX(false);
    } else if (currentX >= this.platformRightEdge - 8 && this.moveDirection === 1) {
      this.moveDirection = -1;
      this.sprite.setVelocityX(-this.moveSpeed);
      this.sprite.setFlipX(true);
    }

    // Ensure consistent movement
    if (this.sprite.body.velocity.x === 0) {
      this.sprite.setVelocityX(this.moveSpeed * this.moveDirection);
    }
  }

  private checkForAttack(): void {
    // This will be implemented when we add player detection
    // For now, just a placeholder for attack logic
  }

  public takeDamage(damage: number = 1): boolean {
    if (this.isDead) return false;

    this.health -= damage;
    
    // Visual feedback for taking damage
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }

    return false;
  }

  private die(): void {
    this.isDead = true;
    
    // Death animation
    this.sprite.setTint(0x666666);
    this.sprite.setVelocity(0, 0);
    
    // Fade out and destroy after a delay
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.sprite.destroy();
      }
    });
  }

  public getPosition(): { x: number, y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public isAlive(): boolean {
    return !this.isDead;
  }

  public getHealth(): number {
    return this.health;
  }

  public setPlatformWidth(width: number): void {
    this.platformWidth = width;
    this.platformLeftEdge = this.sprite.x - width / 2;
    this.platformRightEdge = this.sprite.x + width / 2;
  }

  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
    // Update current velocity
    if (this.sprite.body) {
      this.sprite.setVelocityX(this.moveSpeed * this.moveDirection);
    }
  }

  public handlePlayerAttack(): void {
    if (this.isDead) return;

    // Mark as dead and disable player damage
    this.isDead = true;
    this.canDamagePlayer = false;

    // Apply knockback effect
    if (this.sprite.body) {
      // Remove from platform movement and apply gravity
      (this.sprite.body as Phaser.Physics.Arcade.Body).setGravityY(400);
      
      // Apply knockback velocity (up and to the right)
      const knockbackX = Phaser.Math.Between(100, 200);
      const knockbackY = Phaser.Math.Between(-300, -150);
      this.sprite.setVelocity(knockbackX, knockbackY);
    }

    // Visual feedback for being hit
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });

    // Fade out and destroy after a delay
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        this.sprite.destroy();
      }
    });
  }

  public canStillDamagePlayer(): boolean {
    return this.canDamagePlayer && !this.isDead;
  }
} 