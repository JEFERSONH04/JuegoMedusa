// nos marca los pulsos del juego
window.requestAnimFrame = (function () {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (/* function */ callback, /* DOMElement */ element) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
})();
arrayRemove = function (array, from) {
  var rest = array.slice(from + 1 || array.length);
  array.length = from < 0 ? array.length + from : from;
  return array.push.apply(array, rest);
};

var game = (function () {
  // Variables globales a la aplicacion
  var canvas,
    ctx,
    buffer,
    bufferctx,
    player,
    evil,
    playerShot,
    bgMain,
    bgBoss,
    evilSpeed = 1.5,
    totalEvils = 10,
    playerLife = 3,
    shotSpeed = 5,
    playerSpeed = 5,
    evilCounter = 0,
    youLoose = false,
    congratulations = false,
    minHorizontalOffset = 100,
    maxHorizontalOffset = 600,
    evilShots = 5, // disparos que tiene el malo al principio
    evilLife = 2, // vidas que tiene el malo al principio (se van incrementando)
    finalBossShots = 30,
    finalBossLife = 12,
    totalBestScoresToShow = 5, // las mejores puntuaciones que se mostraran
    playerShotsBuffer = [],
    evilShotsBuffer = [],
    evilShotImage,
    playerShotImage,
    playerKilledImage,
    evilImages = {
      animation: [],
      killed: new Image(),
    },
    bossImages = {
      animation: [],
      killed: new Image(),
    },
    keyPressed = {},
    keyMap = {
      left: 37,
      right: 39,
      fire: 32, // tecla espacio
      mute: 77, //tecla m
    },
    nextPlayerShot = 0,
    playerShotDelay = 250,
    now = 0;

  var evils = []; // Arreglo que almacenará todos los enemigos
  var normalEnemiesCreated = 0; // Contador de enemigos normales creados
  var FinalbossSpawn = false;
  var stopEnemyGeneration = false;

  function loop() {
    update();
    draw();
  }

  function preloadImages() {
    for (var i = 1; i <= 8; i++) {
      var evilImage = new Image();
      evilImage.src = "images/malo" + i + ".png";
      evilImages.animation[i - 1] = evilImage;
      var bossImage = new Image();
      bossImage.src = "images/jefe" + i + ".png";
      bossImages.animation[i - 1] = bossImage;
    }
    evilImages.killed.src = "images/malo_muerto.png";
    bossImages.killed.src = "images/jefe_muerto.png";
    bgMain = new Image();
    bgMain.src = "images/fondovertical.png";
    bgBoss = new Image();
    bgBoss.src = "images/fondovertical_jefe.png";
    playerShotImage = new Image();
    playerShotImage.src = "images/disparo_bueno.png";
    evilShotImage = new Image();
    evilShotImage.src = "images/disparo_malo.png";
    playerKilledImage = new Image();
    playerKilledImage.src = "images/bueno_muerto.png";
  }

  var ingame = new Audio("audio/ingame.mp3");
  function init() {
    preloadImages();

    ingame.play();
    ingame.loop = true;

    showBestScores();

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    buffer = document.createElement("canvas");
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    bufferctx = buffer.getContext("2d");

    player = new Player(playerLife, 0);
    evilCounter = 0;
    for (var i = 0; i < 5; i++) {
      // Aquí defines cuántos enemigos quieres que aparezcan inicialmente
      createNewEvil();
    }

    showLifeAndScore();

    addListener(document, "keydown", keyDown);
    addListener(document, "keyup", keyUp);

    function anim() {
      loop();
      requestAnimFrame(anim);
    }
    anim();
  }

  function showLifeAndScore() {
    bufferctx.fillStyle = "rgb(255, 255, 255)";
    bufferctx.font = "12px 'Press Start 2P'";
    bufferctx.fillText("Puntos: " + player.score, canvas.width - 160, 20);
    bufferctx.fillText("Vidas: " + player.life, canvas.width - 160, 40);
    bufferctx.fillText("Puntos: " + player.score, canvas.width - 160, 20);
    bufferctx.fillText("Enemigos: " + evilCounter, canvas.width - 160, 60);
    bufferctx.fillText("Matar: " + totalEvils, canvas.width - 160, 80);
    bufferctx.fillText("JefeFinal: " + FinalbossSpawn, canvas.width - 200, 100);
  }

  function getRandomNumber(range) {
    return Math.floor(Math.random() * range);
  }

  function Player(life, score) {
    var settings = {
      marginBottom: 10,
      defaultHeight: 66,
    };
    player = new Image();
    player.src = "images/bueno.png";
    player.posX = canvas.width / 2 - player.width / 2;
    player.posY =
      canvas.height -
      (player.height == 0 ? settings.defaultHeight : player.height) -
      settings.marginBottom;
    player.life = life;
    player.score = score;
    player.dead = false;
    player.speed = playerSpeed;

    var shoot = function () {
      if (nextPlayerShot < now || now == 0) {
        playerShot = new PlayerShot(
          player.posX + player.width / 2 - 5,
          player.posY
        );
        playerShot.add();
        now += playerShotDelay;
        nextPlayerShot = now + playerShotDelay;
      } else {
        now = new Date().getTime();
      }
    };

    player.doAnything = function () {
      if (keyPressed.mute) {
        ingame.volume = ingame.volume === 0 ? 1 : 0; // Alternar mute/desmute
      }
      if (player.dead) return;
      if (keyPressed.left && player.posX > 5) player.posX -= player.speed;
      if (keyPressed.right && player.posX < canvas.width - player.width - 5)
        player.posX += player.speed;
      if (keyPressed.fire) shoot();
    };

    player.killPlayer = function () {
      if (this.life > 0) {
        this.dead = true;
        evilShotsBuffer.splice(0, evilShotsBuffer.length);
        playerShotsBuffer.splice(0, playerShotsBuffer.length);
        this.src = playerKilledImage.src;
        if (stopEnemyGeneration === false) {
          createNewEvil();
        }
        setTimeout(function () {
          player = new Player(player.life - 1, player.score);
        }, 500);
      } else {
        saveFinalScore();
        youLoose = true;
      }
    };

    return player;
  }

  /******************************* DISPAROS *******************************/
  function Shot(x, y, array, img) {
    this.posX = x;
    this.posY = y;
    this.image = img;
    this.speed = shotSpeed;
    this.identifier = 0;
    this.add = function () {
      array.push(this);
    };
    this.deleteShot = function (idendificador) {
      arrayRemove(array, idendificador);
    };
  }

  function PlayerShot(x, y) {
    Object.getPrototypeOf(PlayerShot.prototype).constructor.call(
      this,
      x,
      y,
      playerShotsBuffer,
      playerShotImage
    );
    this.isHittingEvil = function () {
      return (
        !evil.dead &&
        this.posX >= evil.posX &&
        this.posX <= evil.posX + evil.image.width &&
        this.posY >= evil.posY &&
        this.posY <= evil.posY + evil.image.height
      );
    };
  }

  PlayerShot.prototype = Object.create(Shot.prototype);
  PlayerShot.prototype.constructor = PlayerShot;

  function EvilShot(x, y) {
    Object.getPrototypeOf(EvilShot.prototype).constructor.call(
      this,
      x,
      y,
      evilShotsBuffer,
      evilShotImage
    );
    this.isHittingPlayer = function () {
      return (
        this.posX >= player.posX &&
        this.posX <= player.posX + player.width &&
        this.posY >= player.posY &&
        this.posY <= player.posY + player.height
      );
    };
  }

  EvilShot.prototype = Object.create(Shot.prototype);
  EvilShot.prototype.constructor = EvilShot;
  /******************************* FIN DISPAROS ********************************/

  /******************************* ENEMIGOS *******************************/
  function Enemy(life, shots, enemyImages) {
    this.image = enemyImages.animation[0];
    this.imageNumber = 1;
    this.animation = 0;
    this.posX = getRandomNumber(canvas.width - this.image.width);
    this.posY = -50;
    this.life = life ? life : evilLife;
    this.speed = evilSpeed;
    this.shots = shots ? shots : evilShots;
    this.dead = false;

    var desplazamientoHorizontal =
      minHorizontalOffset + maxHorizontalOffset - minHorizontalOffset;
    this.minX = canvas.width - desplazamientoHorizontal;
    this.maxX = this.minX + desplazamientoHorizontal - 40;
    this.direction = "D";

    this.kill = function () {
      if (!this.dead) {
        // Prevenir múltiples ejecuciones
        this.dead = true;
        // Decrementa totalEvils SOLO si es mayor que 0
        if (totalEvils > 0) {
          totalEvils--;
        }
        this.image = enemyImages.killed; // Cambia a la imagen de muerte
        this.deathTime = new Date().getTime(); // Guarda el instante de muerte en milisegundos
        // Llamamos a verifyToCreateNewEvil() si es necesario, pero ya no eliminaremos inmediatamente al enemigo.
        verifyToCreateNewEvil();
      }
    };

    this.update = function () {
      this.posY += this.goDownSpeed;
      if (this.direction === "D") {
        if (this.posX <= this.maxX) {
          this.posX += this.speed;
        } else {
          this.direction = "I";
          this.posX -= this.speed;
        }
      } else {
        if (this.posX >= this.minX) {
          this.posX -= this.speed;
        } else {
          this.direction = "D";
          this.posX += this.speed;
        }
      }
      this.animation++;
      if (this.animation > 5) {
        this.animation = 0;
        this.imageNumber++;
        if (this.imageNumber > 8) {
          this.imageNumber = 1;
        }
        this.image = enemyImages.animation[this.imageNumber - 1];
      }
    };

    this.isOutOfScreen = function () {
      return this.posY > canvas.height + 15;
    };

    var self = this; // Capturamos el contexto de la instancia actual
    function shoot() {
      if (self.shots > 0 && !self.dead) {
        var disparo = new EvilShot(
          self.posX + self.image.width / 2 - 5,
          self.posY + self.image.height
        );
        disparo.add();
        self.shots--;
        setTimeout(function () {
          shoot();
        }, getRandomNumber(3000));
      }
    }
    setTimeout(function () {
      shoot();
    }, 1000 + getRandomNumber(2500));

    this.toString = function () {
      return (
        "Enemigo con vidas:" +
        this.life +
        "shotss: " +
        this.shots +
        " puntos por matar: " +
        this.pointsToKill
      );
    };
  }

  function Evil(vidas, disparos) {
    Object.getPrototypeOf(Evil.prototype).constructor.call(
      this,
      vidas,
      disparos,
      evilImages
    );
    this.goDownSpeed = evilSpeed / 10;
    this.pointsToKill = 5 + evilCounter;
  }

  Evil.prototype = Object.create(Enemy.prototype);
  Evil.prototype.constructor = Evil;

  var boss = new Audio("audio/finalboss.mp3");
  function FinalBoss() {
    FinalbossSpawn = true; // Se marca que el jefe final ha aparecido.
    stopEnemyGeneration = true;
    ingame.volume = 0;
    boss.play();
    Object.getPrototypeOf(FinalBoss.prototype).constructor.call(
      this,
      finalBossLife,
      finalBossShots,
      bossImages
    );
    this.goDownSpeed = evilSpeed / 12;
    this.pointsToKill = 20;

    // Sobrescribimos el método kill para el jefe final
    var self = this;
    this.kill = function () {
      if (self.dead) return; // Evitar múltiples ejecuciones
      self.dead = true;
      self.image = bossImages.killed; // Asigna la imagen del jefe final muerto
      self.deathTime = new Date().getTime();

      // Después de 2 segundos, se marca FinalbossSpawn en false
      setTimeout(function () {
        FinalbossSpawn = false;
        // Decrementa totalEvils SOLO si es mayor que 0
        if (totalEvils > 0) {
          totalEvils--;
        }
      }, 2000);
    };
  }

  FinalBoss.prototype = Object.create(Enemy.prototype);
  FinalBoss.prototype.constructor = FinalBoss;
  /******************************* FIN ENEMIGOS *******************************/

  function verifyToCreateNewEvil() {
    if (totalEvils > 0 && stopEnemyGeneration === false) {
      setTimeout(function () {
        createNewEvil();
        evilCounter++;
      }, getRandomNumber(3000));
    } else {
      setTimeout(function () {
        saveFinalScore();
        congratulations = true;
      }, 2000);
    }
  }

  function createNewEvil() {
    if (totalEvils > 1 && FinalbossSpawn === false) {
      evil = new Evil(evilLife + evilCounter - 1, evilShots + evilCounter - 1);
    } else {
      evil = new FinalBoss();
    }
    evils.push(evil); // Agrega la nueva instancia al arreglo
    evilCounter++; // Incrementa el contador (manteniendo la lógica original)
  }

  function isEvilHittingPlayer() {
    for (var i = 0; i < evils.length; i++) {
      var enemigo = evils[i];
      if (
        enemigo.posY + enemigo.image.height > player.posY &&
        player.posY + player.height >= enemigo.posY &&
        ((player.posX >= enemigo.posX &&
          player.posX <= enemigo.posX + enemigo.image.width) ||
          (player.posX + player.width >= enemigo.posX &&
            player.posX + player.width <= enemigo.posX + enemigo.image.width))
      ) {
        return true;
      }
    }
    return false;
  }

  function checkCollisions(shot) {
    for (var i = 0; i < evils.length; i++) {
      var enemigo = evils[i];
      if (
        !enemigo.dead &&
        shot.posX >= enemigo.posX &&
        shot.posX <= enemigo.posX + enemigo.image.width &&
        shot.posY >= enemigo.posY &&
        shot.posY <= enemigo.posY + enemigo.image.height
      ) {
        // Si el disparo acierta
        if (enemigo.life > 1) {
          enemigo.life--;
        } else {
          enemigo.kill();
          player.score += enemigo.pointsToKill;
          evils.splice(i, 1);
        }
        shot.deleteShot(parseInt(shot.identifier));
        return false; // Disparo rebotó al impactar
      }
    }
    return true; // Sin colisión, el disparo continúa
  }

  function playerAction() {
    player.doAnything();
  }

  function addListener(element, type, expression, bubbling) {
    bubbling = bubbling || false;

    if (window.addEventListener) {
      // Standard
      element.addEventListener(type, expression, bubbling);
    } else if (window.attachEvent) {
      // IE
      element.attachEvent("on" + type, expression);
    }
  }

  function keyDown(e) {
    var key = window.event ? e.keyCode : e.which;
    for (var inkey in keyMap) {
      if (key === keyMap[inkey]) {
        e.preventDefault();
        keyPressed[inkey] = true;
      }
    }
  }

  function keyUp(e) {
    var key = window.event ? e.keyCode : e.which;
    for (var inkey in keyMap) {
      if (key === keyMap[inkey]) {
        e.preventDefault();
        keyPressed[inkey] = false;
      }
    }
  }

  function draw() {
    ctx.drawImage(buffer, 0, 0);
  }

  var audio = new Audio("audio/gameover.mp3");
  function showGameOver() {
    bufferctx.fillStyle = "rgb(255, 255, 255)";
    bufferctx.font = "bold 35px 'Press Start 2P'";
    bufferctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
    audio.play();
  }

  function showFinalBossText() {
    bufferctx.fillStyle = "rgb(255, 255, 255)";
    bufferctx.font = "bold 35px 'Press Start 2P'";
    bufferctx.fillText("Jefe final", canvas.width / 2 - 150, canvas.height / 2);
  }

  function showCongratulations() {
    bufferctx.fillStyle = "rgb(255, 255, 255)";
    bufferctx.font = "bold 22px 'Press Start 2P'";
    bufferctx.fillText(
      "Enhorabuena, te has pasado el juego!",
      canvas.width / 2 - 200,
      canvas.height / 2 - 30
    );
    bufferctx.fillText(
      "PUNTOS: " + player.score,
      canvas.width / 2 - 200,
      canvas.height / 2
    );
    bufferctx.fillText(
      "VIDAS: " + player.life + " x 5",
      canvas.width / 2 - 200,
      canvas.height / 2 + 30
    );
    bufferctx.fillText(
      "PUNTUACION TOTAL: " + getTotalScore(),
      canvas.width / 2 - 200,
      canvas.height / 2 + 60
    );
    bufferctx.fillText(
      "PUNTUACION TOTAL: " + FinalbossSpawn,
      canvas.width / 2 - 200,
      canvas.height / 2 + 90
    );
  }

  function getTotalScore() {
    return player.score + player.life * 5;
  }

  function update() {
    drawBackground();

    if (totalEvils === 0 && FinalbossSpawn === false) {
      showCongratulations();
      return;
    }

    if (youLoose) {
      ingame.pause();
      showGameOver();
      const audio = new Audio("audio/gameover.mp3");
      audio.loop = true;
      return;
    }

    // Dibuja al jugador
    bufferctx.drawImage(player, player.posX, player.posY);

    // Recorre el arreglo de enemigos (evils)
    for (var i = evils.length - 1; i >= 0; i--) {
      var enemigo = evils[i];

      // Si el enemigo no está muerto, actualiza y dibuja normalmente
      if (!enemigo.dead) {
        enemigo.update();
        bufferctx.drawImage(enemigo.image, enemigo.posX, enemigo.posY);
        if (enemigo.isOutOfScreen()) {
          enemigo.kill();
        }
      } else {
        // El enemigo ya está muerto, dibujamos su imagen de muerte
        bufferctx.drawImage(enemigo.image, enemigo.posX, enemigo.posY);
      }
    }

    // Actualiza y dibuja los disparos del jugador
    for (var j = 0; j < playerShotsBuffer.length; j++) {
      var disparoBueno = playerShotsBuffer[j];
      updatePlayerShot(disparoBueno, j);
    }

    /// Si se detecta colisión entre el jugador y algún enemigo
    if (isEvilHittingPlayer()) {
      // Si el jefe final está activo, detenemos la generación de nuevos enemigos
      if (FinalbossSpawn === true) {
        stopEnemyGeneration = true;
      }
      player.killPlayer();
    } else {
      for (var k = 0; k < evilShotsBuffer.length; k++) {
        var evilShot = evilShotsBuffer[k];
        updateEvilShot(evilShot, k);
      }
    }

    showLifeAndScore();
    playerAction();
    // Finalmente, se dibuja el contenido del buffer en el canvas principal
    draw();
  }

  function updatePlayerShot(playerShot, id) {
    if (playerShot) {
      playerShot.identifier = id;
      if (checkCollisions(playerShot)) {
        if (playerShot.posY > 0) {
          playerShot.posY -= playerShot.speed;
          bufferctx.drawImage(
            playerShot.image,
            playerShot.posX,
            playerShot.posY
          );
        } else {
          playerShot.deleteShot(parseInt(playerShot.identifier));
        }
      }
    }
  }

  function updateEvilShot(evilShot, id) {
    if (evilShot) {
      evilShot.identifier = id;
      if (!evilShot.isHittingPlayer()) {
        if (evilShot.posY <= canvas.height) {
          evilShot.posY += evilShot.speed;
          bufferctx.drawImage(evilShot.image, evilShot.posX, evilShot.posY);
        } else {
          evilShot.deleteShot(parseInt(evilShot.identifier));
        }
      } else {
        player.killPlayer();
      }
    }
  }

  function drawBackground() {
    var background;

    if (evil instanceof FinalBoss) {
      background = bgBoss;
    } else {
      background = bgMain;
    }
    bufferctx.drawImage(background, 0, 0);
  }

  function updateEvil() {
    if (!evil.dead) {
      evil.update();
      if (evil.isOutOfScreen()) {
        evil.kill();
      }
    }
  }

  /******************************* MEJORES PUNTUACIONES (LOCALSTORAGE) *******************************/
  function saveFinalScore() {
    localStorage.setItem(getFinalScoreDate(), getTotalScore());
    showBestScores();
    removeNoBestScores();
  }

  function getFinalScoreDate() {
    var date = new Date();
    return (
      fillZero(date.getDay() + 1) +
      "/" +
      fillZero(date.getMonth() + 1) +
      "/" +
      date.getFullYear() +
      " " +
      fillZero(date.getHours()) +
      ":" +
      fillZero(date.getMinutes()) +
      ":" +
      fillZero(date.getSeconds())
    );
  }

  function fillZero(number) {
    if (number < 10) {
      return "0" + number;
    }
    return number;
  }

  function getBestScoreKeys() {
    var bestScores = getAllScores();
    bestScores.sort(function (a, b) {
      return b - a;
    });
    bestScores = bestScores.slice(0, totalBestScoresToShow);
    var bestScoreKeys = [];
    for (var j = 0; j < bestScores.length; j++) {
      var score = bestScores[j];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (parseInt(localStorage.getItem(key)) == score) {
          bestScoreKeys.push(key);
        }
      }
    }
    return bestScoreKeys.slice(0, totalBestScoresToShow);
  }

  function getAllScores() {
    var all = [];
    for (var i = 0; i < localStorage.length; i++) {
      all[i] = localStorage.getItem(localStorage.key(i));
    }
    return all;
  }

  function showBestScores() {
    var bestScores = getBestScoreKeys();
    var bestScoresList = document.getElementById("puntuaciones");
    if (bestScoresList) {
      clearList(bestScoresList);
      for (var i = 0; i < bestScores.length; i++) {
        addListElement(
          bestScoresList,
          bestScores[i],
          i == 0 ? "negrita" : null
        );
        addListElement(
          bestScoresList,
          localStorage.getItem(bestScores[i]),
          i == 0 ? "negrita" : null
        );
      }
    }
  }

  function clearList(list) {
    list.innerHTML = "";
    addListElement(list, "Fecha");
    addListElement(list, "Puntos");
  }

  function addListElement(list, content, className) {
    var element = document.createElement("li");
    if (className) {
      element.setAttribute("class", className);
    }
    element.innerHTML = content;
    list.appendChild(element);
  }

  // extendemos el objeto array con un metodo "containsElement"
  Array.prototype.containsElement = function (element) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == element) {
        return true;
      }
    }
    return false;
  };

  function removeNoBestScores() {
    var scoresToRemove = [];
    var bestScoreKeys = getBestScoreKeys();
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!bestScoreKeys.containsElement(key)) {
        scoresToRemove.push(key);
      }
    }
    for (var j = 0; j < scoresToRemove.length; j++) {
      var scoreToRemoveKey = scoresToRemove[j];
      localStorage.removeItem(scoreToRemoveKey);
    }
  }
  /******************************* FIN MEJORES PUNTUACIONES *******************************/

  return {
    init: init,
  };
})();
