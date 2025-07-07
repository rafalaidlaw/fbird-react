import Phaser from "phaser";
import PreloadScene from "./scenes/PreloadScene";
import PlayScene from "./scenes/PlayScene";
import MenuScene from "./scenes/MenuScene";
import ScoreScene from "./scenes/ScoreScene";
import PauseScene from "./scenes/PauseScene";

const WIDTH = 400;
const HEIGHT = 500;
const KILBOY_POSITION = { x: (WIDTH * 1) / 10, y: HEIGHT / 2 };

interface SharedConfig {
  width: number;
  height: number;
  startPosition: { x: number; y: number };
}

const SHARED_CONFIG: SharedConfig = {
  width: WIDTH,
  height: HEIGHT,
  startPosition: KILBOY_POSITION,
};

const Scenes = [PreloadScene, MenuScene, ScoreScene, PlayScene, PauseScene];
const createScene = (Scene: any) => new Scene(SHARED_CONFIG);
const initScenes = () => Scenes.map(createScene);

const config: Phaser.Types.Core.GameConfig = {
  //WebGL web graphics library
  type: Phaser.AUTO,
  ...SHARED_CONFIG,
  render: {
    canvas: {
      willReadFrequently: true
    }
  },
  physics: {
    // Arcade physics plugin manages physics simulation
    default: "arcade",
    arcade: {
      // gravity: { y: 400 },
      debug: false
    },
  },
  scene: initScenes(),
} as Phaser.Types.Core.GameConfig;

const game = new Phaser.Game(config);

// Set willReadFrequently on the canvas after Phaser initializes
game.canvas.setAttribute('willReadFrequently', 'true'); 