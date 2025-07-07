import Phaser from "phaser";

export default class UIManager {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private bestScoreText: Phaser.GameObjects.Text | null = null;
  private jumpRectangles: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createScoreUI(score: number, bestScore: number) {
    this.scoreText = this.scene.add.text(16, 16, `Score: ${score}`, {
      fontSize: "32px",
      color: "#000",
    });
    this.bestScoreText = this.scene.add.text(16, 52, `Best Score: ${bestScore}`, {
      fontSize: "18px",
      color: "#000",
    });
  }

  updateScore(score: number) {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${score}`);
    }
  }

  createJumpRectangles() {
    this.jumpRectangles.forEach(rect => rect.destroy());
    this.jumpRectangles = [];
    for (let i = 0; i < 3; i++) {
      const rect = this.scene.add.rectangle(16, 120 + (i * 25), 20, 20, 0xffff00, 0.2);
      this.jumpRectangles.push(rect);
    }
  }

  updateJumpRectangles(jumpCount: number) {
    for (let i = 0; i < this.jumpRectangles.length; i++) {
      this.jumpRectangles[i].setAlpha(i >= (3 - jumpCount) ? 1 : 0.2);
    }
  }

  updateJumpRectanglesAtDeath(jumpCountAtDeath: number) {
    for (let i = 0; i < this.jumpRectangles.length; i++) {
      this.jumpRectangles[i].setAlpha(i >= (3 - jumpCountAtDeath) ? 1 : 0.2);
    }
  }

  getJumpRectangles(): Phaser.GameObjects.Rectangle[] {
    return this.jumpRectangles;
  }
} 