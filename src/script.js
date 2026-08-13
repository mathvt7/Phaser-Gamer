// ================= CONFIGURACIÓN =================
var config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,

    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },

    scene: {
        preload: preload,
        create: create,
        update: update,
    },

    scale: {
        mode: Phaser.Scale.RESIZE
    }
};

// ================= VARIABLES =================
var score = 0;
var scoreText;

var highScore = localStorage.getItem("highScore")
    ? parseInt(localStorage.getItem("highScore"))
    : 0;

var highScoreText;

var lives = 3;
var lifeSprites = [];

var gameOver = false;
var loseText;
var newText;

var platforms;
var player;
var cursors;
var stars;
var bombs;

var timerText;
var elapsedTime = 0;

var music;
var bombSound;
var gameOverSound;
var newScoreSound;

var game = new Phaser.Game(config);

// ================= PRELOAD =================
function preload() {

    this.load.image("sky", "assets/sky.png");
    this.load.image("ground", "assets/platform.png");
    this.load.image("star", "assets/star.png");
    this.load.image("bomb", "assets/bomb.png");

    this.load.spritesheet("dude", "assets/dude.png", {
        frameWidth: 32,
        frameHeight: 48
    });

    this.load.image("watermark", "assets/watermark.png");
    this.load.audio("music", "assets/music.mp3");
    this.load.audio("bombSound", "assets/explosion.mp3");
    this.load.audio("gameOverSound", "assets/gameover.mp3");
    this.load.audio("newScoreSound", "assets/newscore.mp3");
}

// ================= CREATE =================
function create() {

    this.add.image(config.width/2, config.height/2, "sky")
        .setDisplaySize(config.width, config.height);

    // ================= MÚSICA =================
    music = this.sound.add("music", { loop: true, volume: 0.4 });

    // Función para reproducir el audio tras la primera interacción del usuario
    const playMusicOnce = () => {
        if (!music.isPlaying) {
            music.play();
        }
        // Eliminamos el evento para que no se ejecute múltiples veces
        this.input.keyboard.off('keydown', playMusicOnce);
        this.input.off('pointerdown', playMusicOnce);
    };

    // Escuchamos cualquier tecla o clic para arrancar la música
    this.input.keyboard.on('keydown', playMusicOnce);
    this.input.on('pointerdown', playMusicOnce);
    // PLATAFORMAS
    platforms = this.physics.add.staticGroup();

    const bottomPlatform =
        platforms.create(config.width/2, config.height - 16, "ground");

    bottomPlatform.setScale(config.width / bottomPlatform.width);
    bottomPlatform.refreshBody();

            //TAMAÑO
    platforms.create(150, 300, "ground").setScale(2.3, 1.5).refreshBody(); 
    platforms.create(config.width-200,150,"ground").setScale(1.9,1.5).refreshBody(); 
    platforms.create(config.width-300,450,"ground").setScale(1.7,1.5).refreshBody();

    // JUGADOR
    player = this.physics.add.sprite(100, 450, "dude");
    player.setCollideWorldBounds(true);
    player.setBounce(0.2);

    // ANIMACIONES
    this.anims.create({
        key:"left",
        frames:this.anims.generateFrameNumbers("dude",{start:0,end:3}),
        frameRate:10,
        repeat:-1
    });

    this.anims.create({
        key:"turn",
        frames:[{key:"dude",frame:4}],
        frameRate:20
    });

    this.anims.create({
        key:"right",
        frames:this.anims.generateFrameNumbers("dude",{start:5,end:8}),
        frameRate:10,
        repeat:-1
    });

    this.physics.add.collider(player, platforms);

    cursors = this.input.keyboard.createCursorKeys();

    // ===== VIDAS =====
    for (let i = 0; i < 3; i++) {
        let vida = this.add.sprite(40 + i*40, config.height-40,"dude",4);
        vida.setScale(1.2);
        vida.setScrollFactor(0);
        lifeSprites.push(vida);
    }

    // ===== ESTRELLAS =====
    stars = this.physics.add.group({
        key:"star",
        repeat:11,
        setXY:{x:12,y:0,stepX:config.width/12}
    });

    stars.children.iterate(c=>{
        c.setBounceY(Phaser.Math.FloatBetween(0.4,0.8));
    });

    this.physics.add.collider(stars,platforms);
    this.physics.add.overlap(player,stars,collecStar,null,this);

    // TEXTOS
    scoreText=this.add.text(16,16,"Score: 0",{fontSize:"25px",fill:"#000"});
    highScoreText=this.add.text(16,50,"High Score: "+highScore,{fontSize:"25px",fill:"#000"});
    timerText=this.add.text(16,84,"Time: 0:00",{fontSize:"25px",fill:"#000"});


    
    // EVENTO DEL TIEMPO
    this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!gameOver) {
                elapsedTime++;
                timerText.setText("Time: " + formatTime(elapsedTime));
            }
        },
        loop: true
    });


    // BOMBAS
    bombs=this.physics.add.group();
    this.physics.add.collider(bombs,platforms);
    this.physics.add.collider(player,bombs,hitBomb,null,this);

    loseText=this.add.text(config.width/2,config.height/2-40,"",{
        fontSize:"48px",fill:"#ff0000"
    }).setOrigin(0.5);

    newText=this.add.text(config.width/2,config.height/2-40,"",{
        fontSize:"48px",fill:"#ffff00"
    }).setOrigin(0.5);

// ================= MARCAS DE AGUA =================

let posicionY = this.scale.height - 16; 

// FIRMA 
let firmaM = this.add.image(
    this.scale.width - 20,
    posicionY,
    "watermark"
);

firmaM.setOrigin(1, 0.7); //COORDENADAS
firmaM.setAlpha(0.8);
firmaM.setScale(0.1); 
firmaM.setDepth(100);
firmaM.setScrollFactor(0);

this.scale.on('resize', (gameSize) => {
    let nuevaY = gameSize.height - 16;

    firmaM.x = gameSize.width / 2;
    firmaM.y = nuevaY;
});

}

// ================= UPDATE =================
function update(){

    if(gameOver) return;

    if(cursors.left.isDown){
        player.setVelocityX(-160);
        player.anims.play("left",true);

    }else if(cursors.right.isDown){
        player.setVelocityX(160);
        player.anims.play("right",true);

    }else{
        player.setVelocityX(0);
        player.anims.play("turn");
    }

    if(cursors.up.isDown && player.body.touching.down){
        player.setVelocityY(-400);
    }
}

// ================= ESTRELLAS =================
function collecStar(player, star){

    star.disableBody(true, true);

    score += 10;
    scoreText.setText("Score: " + score);

    if(score > highScore){
        highScore = score;
        highScoreText.setText("High Score: " + highScore);
        localStorage.setItem("highScore", highScore);
    }

    if (stars.countActive(true) === 0){

        // reaparecer estrellas
        stars.children.iterate(function (child) {
            child.enableBody(true, child.x, 0, true, true);
        });

        // crear bomba
        var x = (player.x < config.width / 2)
            ? Phaser.Math.Between(config.width / 2, config.width)
            : Phaser.Math.Between(0, config.width / 2);

        var bomb = bombs.create(x, 16, "bomb");
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(
            Phaser.Math.Between(-200, 200),
            20
        );
    }
}

// ================= BOMBA =================
function hitBomb(player, bomb){

    bombSound.play();

    lives--;

    // Ocultar corazón
    if(lifeSprites[lives]){
        lifeSprites[lives].setVisible(false);
    }

    // Desactivar la bomba que te golpeó
    bomb.disableBody(true, true);


    if(lives > 0){

        player.setTint(0xff0000);

        this.time.delayedCall(600, () => {

            player.clearTint();

            player.setPosition(100, 450);   // REGRESAR AL INICIO
            player.setVelocity(0, 0);       

        });

    } 
    // ===== GAME OVER =====
    else {

        this.physics.pause();
        gameOver = true;

        music.stop();

        loseText.setText("GAME OVER");
        gameOverSound.play();

        this.time.delayedCall(2000, () => {

            loseText.setText("");

            if(score >= highScore){
                newText.setText("¡NEW SCORE!");
                newScoreSound.play();
            }

        });

        // REINICIO
        setTimeout(() => {
            location.reload();
        }, 7000);
    }
}

function formatTime(seconds){
    const minutes = Math.floor(seconds / 60);
    const partInSeconds = seconds % 60;
    const paddedSeconds = partInSeconds.toString().padStart(2,'0');

    return `${minutes}:${paddedSeconds}`;
}
