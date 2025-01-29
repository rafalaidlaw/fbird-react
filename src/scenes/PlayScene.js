import Phaser from "phaser";

const PIPES_TO_RENDER = 4;

class PlayScene extends Phaser.Scene {
  constructor(config) {
    super("PlayScene");
    this.config = config;

    this.kilboy = null;
    this.pipes = null;

    this.pipeHorizontalDistance = 0;
    this.pipeVerticalDistanceRange = [150, 250];
    this.pipeHorizontalDistanceRange = [450, 500];
    this.flapVELOCITY = 300;
  }

  preload() {
    this.load.image("sky-bg", "assets/sky.png");
    this.load.image("kilboy", "assets/kilboy.png");
    this.load.image("pipe", "assets/pipe.png");
  }

  create() {
    this.createBG();
    this.createKilboy();
    this.createPipes();
    this.createColiders();
    this.handleInputs();
  }

  update() {
    this.checkGameStatus();

    this.recyclePipes();
  }

  createBG() {
    this.add.image(0, 0, "sky-bg").setOrigin(0);
  }
  createKilboy() {
    this.kilboy = this.physics.add
      .sprite(
        this.config.startPosition.x,
        this.config.startPosition.y,
        "kilboy"
      )
      .setOrigin(0);
    this.kilboy.body.gravity.y = 400;
    this.kilboy.setCollideWorldBounds(true);
  }
  createPipes() {
    this.pipes = this.physics.add.group();
    for (let i = 0; i < PIPES_TO_RENDER; i++) {
      const upperPipe = this.pipes
        .create(0, 0, "pipe")
        .setImmovable(true)
        .setOrigin(0, 1);
      const lowerPipe = this.pipes
        .create(0, 0, "pipe")
        .setImmovable(true)
        .setOrigin(0);

      this.placePipe(upperPipe, lowerPipe);
    }

    this.pipes.setVelocityX(-200);
  }

  createColiders() {
    this.physics.add.collider(
      this.kilboy,
      this.pipes,
      this.gameOver,
      null,
      this
    );
  }
  handleInputs() {
    this.input.on("pointerdown", this.flap, this);

    this.input.keyboard.on("keydown-SPACE", this.flap, this);
  }
  checkGameStatus() {
    if (
      this.kilboy.y <= 0 ||
      this.kilboy.y >= this.config.height - this.kilboy.height
    ) {
      this.gameOver();
    }
  }
  placePipe(upPipe, lowPipe) {
    const rightMostX = this.getRightMostPipe();
    const pipeVerticalDistance = Phaser.Math.Between(
      ...this.pipeVerticalDistanceRange
    );
    const pipeVerticalPosition = Phaser.Math.Between(
      0 + 20,
      this.config.height - 20 - pipeVerticalDistance
    );
    const pipeHorizontalDistance = Phaser.Math.Between(
      ...this.pipeHorizontalDistanceRange
    );

    upPipe.x = rightMostX + pipeHorizontalDistance;
    upPipe.y = pipeVerticalPosition;

    lowPipe.x = upPipe.x;
    lowPipe.y = upPipe.y + pipeVerticalDistance;
  }
  recyclePipes() {
    const tempPipes = [];
    this.pipes.getChildren().forEach((pipe) => {
      if (pipe.getBounds().right <= -1) {
        tempPipes.push(pipe);
        if (tempPipes.length === 2) {
          this.placePipe(...tempPipes);
        }
      }
    });
  }
  getRightMostPipe() {
    let rightMostX = 0;
    this.pipes.getChildren().forEach(function (pipe) {
      rightMostX = Math.max(pipe.x, rightMostX);
    });
    return rightMostX;
  }

  gameOver() {
    //     this.kilboy.x = this.config.startPosition.x;
    //     this.kilboy.y = this.config.startPosition.y;
    //     this.kilboy.body.velocity.y = 0;
    //     this.kilboy.gravity = 0;
    this.physics.pause();
    this.kilboy.setTint(0xff0000);
  }

  flap() {
    this.kilboy.body.velocity.y = -this.flapVELOCITY;
  }
}

export default PlayScene;
