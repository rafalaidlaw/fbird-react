import Phaser from "phaser";

export default class UIManager {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private bestScoreText: Phaser.GameObjects.Text | null = null;
  private jumpRectangles: Phaser.GameObjects.Rectangle[] = [];
  private lastJumpUIState: number[] = [0, 0]; // Track last two lit counts
  private healthIcons: Phaser.GameObjects.Image[] = [];
  private scoreAnimationTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createScoreUI(score: number, bestScore: number) {
    const screenWidth = this.scene.sys.game.config.width as number;
    
    // Create text with BKShatteredScore font - should be loaded by PreloadScene
    this.scoreText = this.scene.add.text(screenWidth - 16, 16, `${score}`, {
      fontSize: '24px',
      color: '#7ad0ff',
      fontFamily: 'BKShatteredScore',
      stroke: '#000',
      strokeThickness: 0
    }).setOrigin(1, 0); // Right align
    this.scoreText.setScrollFactor(0); // Fix to camera
    this.scoreText.setDepth(15); // Ensure UI is on top of pipes
  }

  updateScore(score: number) {
    if (this.scoreText) {
      const currentScore = parseInt(this.scoreText.text) || 0;
      if (score > currentScore) {
        // Animate the score count up
        this.animateScoreCountUp(currentScore, score);
      } else {
        // For score decreases or same value, just set directly
        this.scoreText.setText(`${score}`);
      }
    }
  }

  private animateScoreCountUp(fromScore: number, toScore: number) {
    const duration = 300; 
    const steps = 30; // Number of steps in the animation
    const stepDuration = duration / steps;
    const scoreIncrement = (toScore - fromScore) / steps;
    
    let currentStep = 0;
    
    // If there's already an animation running, extend it
    if (this.scoreAnimationTimer) {
      this.scoreAnimationTimer.destroy();
    }
    
    this.scoreAnimationTimer = this.scene.time.addEvent({
      delay: stepDuration,
      callback: () => {
        currentStep++;
        const currentScore = Math.floor(fromScore + (scoreIncrement * currentStep));
        
        if (this.scoreText) {
          this.scoreText.setText(`${currentScore}`);
        }
        
        // Stop the animation when we reach the target score
        if (currentStep >= steps) {
          if (this.scoreText) {
            this.scoreText.setText(`${toScore}`);
          }
          this.scoreAnimationTimer = null;
        }
      },
      loop: true
    });
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