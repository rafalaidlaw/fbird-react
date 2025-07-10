import Phaser from "phaser";
import { MenuItem } from "../interface";

interface SceneConfig {
  width: number;
  height: number;
  canGoBack?: boolean;
  startPosition: { x: number; y: number };
}

class BaseScene extends Phaser.Scene {
  protected config: SceneConfig;
  protected screenCenter: [number, number];
  protected fontSize: number;
  protected lineHeight: number;
  protected fontOptions: { fontSize: string; color: string };

  constructor(key: string, config: SceneConfig) {
    super(key);
    this.config = config;
    this.screenCenter = [config.width / 2, config.height / 2];
    this.fontSize = 34;
    this.lineHeight = 42;
    this.fontOptions = { fontSize: `${this.fontSize}px`, color: "#fff" };
  }

  create(): void {
    this.add.image(0, 0, "sky-bg").setOrigin(0);
    if (this.config.canGoBack) {
      const backButton = this.add
        .image(this.config.width - 10, this.config.height - 10, "back")
        .setOrigin(1)
        .setScale(2)
        .setInteractive()
        .setDepth(10); // Ensure back button is on top of all game objects
      
      backButton.setScrollFactor(0); // Fix to camera
      
      backButton.on("pointerup", () => {
        this.scene.start("MenuScene");
      });
    }
  }

  createMenu(menu: MenuItem[], setupMenuEvents: (menuItem: MenuItem) => void): void {
    let lastMenuPositionY = 0;
    menu.forEach((menuItem) => {
      const menuPosition: [number, number] = [
        this.screenCenter[0],
        this.screenCenter[1] + lastMenuPositionY,
      ];
      menuItem.textGO = this.add
        .text(...menuPosition, menuItem.text, this.fontOptions)
        .setOrigin(0.5, 1);
      lastMenuPositionY += this.lineHeight;
      setupMenuEvents(menuItem);
    });
  }
}

export default BaseScene; 