import BaseScene from "./BaseScene";

class PauseScene extends BaseScene {
  private menu: { scene: string; text: string; textGO?: Phaser.GameObjects.Text }[];

  constructor(config: any) {
    super("PauseScene", config);

    this.menu = [
      { scene: "PlayScene", text: "Continue" },
      { scene: "MenuScene", text: "Exit" },
    ];
  }

  create(): void {
    super.create();
    this.createMenu(this.menu as any, this.setupMenuEvents.bind(this) as any);
  }

  setupMenuEvents(menuItem: { scene: string; text: string; textGO?: Phaser.GameObjects.Text }): void {
    const textGO = menuItem.textGO!;
    textGO.setInteractive();

    textGO.on("pointerover", () => {
      textGO.setStyle({ fill: "#ff0" });
    });

    textGO.on("pointerout", () => {
      textGO.setStyle({ fill: "#fff" });
    });

    textGO.on("pointerup", () => {
      if (menuItem.scene && menuItem.text === "Continue") {
        // Shutting down the Pause Scene and resuming the Play Scene
        this.scene.stop();
        this.scene.resume(menuItem.scene);
      } else {
        // Shutting PlayScene, PauseScene and running Menu
        this.scene.stop("PlayScene");
        this.scene.start(menuItem.scene);
      }
    });
  }
}

export default PauseScene; 