import Phaser from "phaser";

export default class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.Physics.Arcade.Sprite;
  private invincible: boolean = false;
  private invincibleFlashTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, startPosition: { x: number, y: number }) {
    this.scene = scene;
    this.sprite = this.scene.physics.add
      .sprite(startPosition.x, startPosition.y, "kilboy")
      .setOrigin(0)
      .setDepth(1);
    this.sprite.setBodySize(this.sprite.width, this.sprite.height - 8);
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
    if (this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.y = -initialFlapVelocity;
    }
    this.sprite.setTexture("kilboy2");
  }

  setInvincible(invincible: boolean) {
    this.invincible = invincible;
    if (invincible) {
      this.startInvincibleFlash();
    } else {
      this.stopInvincibleFlash();
      this.sprite.setAlpha(1);
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
} 