import Phaser from "phaser";

import PlayScene from "./scenes/PlayScene";

const WIDTH = 800;
const HEIGHT = 600;
const KILBOY_POSITION = { x: (WIDTH * 1) / 10, y: HEIGHT / 2 };
const SHARED_CONFIG = {
  width: WIDTH,
  height: HEIGHT,
  startPosition: KILBOY_POSITION,
};
const config = {
  //WebGL web graphics library
  type: Phaser.AUTO,
  ...SHARED_CONFIG,
  physics: {
    // Arcade physics plugin manages physics simulation
    default: "arcade",
    arcade: {
      // gravity: { y: 400 },
      debug: true,
    },
  },
  scene: [new PlayScene(SHARED_CONFIG)],
};
//loading assets, such as images, music, animations
function preload() {
  // 'this' context - scene
  //contains functions and properties we can use

  this.load.image("pipe", "assets/pipe.png");
}

const flapVELOCITY = 300;
const PIPES_TO_RENDER = 4;

const initialKilroyPosition = { x: config.width * 0.1, y: config.height / 2 };

const VELOCITY = 200;

let kilroy = null;
let pipes = null;

let pipeHorizontalDistance = 0;
let pipeVerticalDistanceRange = [150, 250];
const pipeHorizontalDistanceRange = [450, 500];

function create() {
  pipes = this.physics.add.group();

  for (let i = 0; i < PIPES_TO_RENDER; i++) {
    ////////////////////////////////////////////////////////////// /////////////////////////////////<======== pipe generating for loop

    const upperPipe = pipes.create(0, 0, "pipe").setOrigin(0, 1);
    const lowerPipe = pipes.create(0, 0, "pipe").setOrigin(0);

    placePipe(upperPipe, lowerPipe);
  }

  pipes.setVelocityX(-200);

  this.input.on("pointerdown", flap);

  this.input.keyboard.on("keydown-SPACE", flap);
}

//if kilroy position x is same or larger than width of canvas go back left
//if kilroy smaller than 0 than move back right

function update(time, delta) {
  if (kilroy.y <= 0 - kilroy.height || kilroy.y >= config.height) {
    restartKilroyPosition();
    // alert("You have lost");
  }
  recyclePipes();
}

function placePipe(upPipe, lowPipe) {
  const rightMostX = getRightMostPipe();
  const pipeVerticalDistance = Phaser.Math.Between(
    ...pipeVerticalDistanceRange
  );
  const pipeVerticalPosition = Phaser.Math.Between(
    0 + 20,
    config.height - 20 - pipeVerticalDistance
  );
  const pipeHorizontalDistance = Phaser.Math.Between(
    ...pipeHorizontalDistanceRange
  );

  upPipe.x = rightMostX + pipeHorizontalDistance;
  upPipe.y = pipeVerticalPosition;

  lowPipe.x = upPipe.x;
  lowPipe.y = upPipe.y + pipeVerticalDistance;
}

function recyclePipes() {
  const tempPipes = [];
  pipes.getChildren().forEach((pipe) => {
    if (pipe.getBounds().right <= -1) {
      tempPipes.push(pipe);
      if (tempPipes.length === 2) {
        placePipe(...tempPipes);
      }
    }
  });
}

function getRightMostPipe() {
  let rightMostX = 0;
  pipes.getChildren().forEach(function (pipe) {
    rightMostX = Math.max(pipe.x, rightMostX);
  });
  return rightMostX;
}

function restartKilroyPosition() {
  kilroy.x = initialKilroyPosition.x;
  kilroy.y = initialKilroyPosition.y;
  kilroy.body.velocity.y = 0;
  kilroy.gravity = 0;
}

function flap() {
  kilroy.body.velocity.y = -flapVELOCITY;
}

new Phaser.Game(config);
