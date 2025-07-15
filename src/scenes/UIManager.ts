import Phaser from "phaser";

export default class UIManager {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private bestScoreText: Phaser.GameObjects.Text | null = null;
  private jumpRectangles: Phaser.GameObjects.Rectangle[] = [];
  private lastJumpUIState: number[] = [0, 0]; // Track last two lit counts
  private healthIcons: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createScoreUI(score: number, bestScore: number) {
    const screenWidth = this.scene.sys.game.config.width as number;
    this.scoreText = this.scene.add.text(screenWidth - 16, 16, `${score}`, {
      fontSize: '32px',
      color: '#fff',
      fontFamily: 'Arial',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(1, 0); // Right align
    this.scoreText.setScrollFactor(0); // Fix to camera
    this.scoreText.setDepth(15); // Ensure UI is on top of pipes
    // Best score display is hidden
  }

  updateScore(score: number) {
    if (this.scoreText) {
      this.scoreText.setText(`${score}`);
    }
  }

  createJumpRectangles() {
    this.jumpRectangles.forEach(rect => rect.destroy());
    this.jumpRectangles = [];
    for (let i = 0; i < 3; i++) {
      const rect = this.scene.add.rectangle(16, 120 + (i * 25), 20, 20, 0xffff00, 0.2);
      rect.setScrollFactor(0); // Fix to camera
      rect.setDepth(15); // Ensure UI is on top of pipes
      this.jumpRectangles.push(rect);
    }
  }

  updateJumpRectangles(jumpCount: number) {
    let litCount = 0;
    for (let i = 0; i < this.jumpRectangles.length; i++) {
      if (i >= (3 - jumpCount)) litCount++;
      this.jumpRectangles[i].setAlpha(i >= (3 - jumpCount) ? 1 : 0.2);
    }
    // Update history
    this.lastJumpUIState[0] = this.lastJumpUIState[1];
    this.lastJumpUIState[1] = litCount;
  }

  getPreviousJumpLitCount(): number {
    return this.lastJumpUIState[0];
  }

  updateJumpRectanglesAtDeath(): void {
    const litCount = this.getPreviousJumpLitCount();
    for (let i = 0; i < this.jumpRectangles.length; i++) {
      this.jumpRectangles[i].setAlpha(i >= (3 - litCount) ? 1 : 0.2);
    }
  }

  getJumpRectangles(): Phaser.GameObjects.Rectangle[] {
    return this.jumpRectangles;
  }

  createHealthUI(maxHealth: number) {
    // Remove any existing icons
    this.healthIcons.forEach(icon => icon.destroy());
    this.healthIcons = [];
    const iconSpacing = 40;
    const iconY = 32;
    for (let i = 0; i < maxHealth; i++) {
      const icon = this.scene.add.image(16 + i * iconSpacing, iconY, 'health-face').setOrigin(0, 0).setScale(1.2);
      icon.setScrollFactor(0); // Fix to camera
      icon.setDepth(15); // Ensure UI is on top of pipes
      this.healthIcons.push(icon);
    }
  }

  updateHealthUI(currentHealth: number) {
    for (let i = 0; i < this.healthIcons.length; i++) {
      if (i < currentHealth) {
        this.healthIcons[i].setTexture('health-face');
        this.healthIcons[i].setAlpha(1);
      } else {
        this.healthIcons[i].setTexture('dead-face');
        this.healthIcons[i].setAlpha(1);
      }
    }
  }
} 