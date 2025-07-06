import BaseScene from "./BaseScene";
import { MenuItem } from "../interface";

class MenuScene extends BaseScene {
  private menu: MenuItem[];

  constructor(config: any) {
    super("MenuScene", config);

    this.menu = [
      { scene: "PlayScene", text: "Play" },
      { scene: "ScoreScene", text: "Score" },
      { scene: null, text: "Exit" },
    ];
  }

  create(): void {
    super.create();
    this.createMenu(this.menu, this.setupMenuEvents.bind(this));
  }

  setupMenuEvents(menuItem: MenuItem): void {
    const textGO = menuItem.textGO!;
    textGO.setInteractive();
    textGO.on("pointerover", () => {
      textGO.setStyle({ color: "#ff0" });
    });
    textGO.on("pointerout", () => {
      textGO.setStyle({ color: "#fff" });
    });
    textGO.on("pointerup", () => {
      menuItem.scene && this.scene.start(menuItem.scene);
      if (menuItem.text === "Exit") {
        this.game.destroy(true);
      }
    });
  }
}

export default MenuScene; 