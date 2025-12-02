/**
 * Created by Alvin Wan (alvinwan.com)
 **/

const POSITION_X_LEFT = -0.5;
const POSITION_X_CENTER = 0;
const POSITION_X_RIGHT = 0.5;

var player_position_index = 1;
var is360View = false;  // Variable para controlar si la vista 360 está activa

/**
 * Move player to provided index
 * @param {int} Lane to move player to
 */
function movePlayerTo(position_index) {
  if (position_index < 0) position_index = 0;
  if (position_index > 2) position_index = 2;
  player_position_index = position_index;

  position = {x: 0, y: 0, z: 0}
  if      (player_position_index == 0) position.x = POSITION_X_LEFT;
  else if (player_position_index == 1) position.x = POSITION_X_CENTER;
  else                                 position.x = POSITION_X_RIGHT;
  document.getElementById('player').setAttribute('position', position);
}

/**
 * Detecta si el usuario presiona el botón en los lentes para activar la vista 360
 */
AFRAME.registerComponent('vr-button-controls', {
  init: function () {
    var controllerEl = this.el;
    
    // Detecta el botón presionado (por ejemplo, el trigger)
    controllerEl.addEventListener('buttondown', (e) => {
      if (e.detail.id === 'trigger') {
        toggle360View();
      }
    });
  }
});

/**
 * Activa o desactiva la vista 360 en la escena
 */
function toggle360View() {
  var scene = document.querySelector('a-scene');
  
  if (is360View) {
    // Si la vista 360 está activa, desactivamos el modo VR y restablecemos la escena
    scene.setAttribute('vr-mode-ui', 'enabled: true');
    scene.setAttribute('embedded', 'false');
    is360View = false;
    console.log("Vista 360 desactivada");
  } else {
    // Si la vista 360 no está activa, la activamos
    scene.setAttribute('vr-mode-ui', 'enabled: false');
    scene.setAttribute('embedded', 'true');
    is360View = true;
    console.log("Vista 360 activada");
  }
}

/*********
 * TREES *
 *********/

var templateTreeLeft;
var templateTreeCenter;
var templateTreeRight;
var templates;
var treeContainer;
var numberOfTrees = 0;
var treeTimer;

function setupTrees() {
  templateTreeLeft    = document.getElementById('template-tree-left');
  templateTreeCenter  = document.getElementById('template-tree-center');
  templateTreeRight   = document.getElementById('template-tree-right');
  templates           = [templateTreeLeft, templateTreeCenter, templateTreeRight];
  treeContainer       = document.getElementById('tree-container');

  removeTree(templateTreeLeft);
  removeTree(templateTreeRight);
  removeTree(templateTreeCenter);
}

function teardownTrees() {
  clearInterval(treeTimer);
}

function addTree(el) {
  numberOfTrees += 1;
  el.id = 'tree-' + numberOfTrees;
  treeContainer.appendChild(el);
}

function removeTree(tree) {
  tree.parentNode.removeChild(tree);
}

function addTreeTo(position_index) {
  var template = templates[position_index];
  addTree(template.cloneNode(true));
}

/**
 * Add any number of trees across different lanes, randomly.
 **/
function addTreesRandomly(
  {
    probTreeLeft = 0.5,
    probTreeCenter = 0.5,
    probTreeRight = 0.5,
    maxNumberTrees = 2
  } = {}) {

  var trees = [
    {probability: probTreeLeft,   position_index: 0},
    {probability: probTreeCenter, position_index: 1},
    {probability: probTreeRight,  position_index: 2},
  ]
  shuffle(trees);

  var numberOfTreesAdded = 0;
  var position_indices = [];
  trees.forEach(function (tree) {
    if (Math.random() < tree.probability && numberOfTreesAdded < maxNumberTrees) {
      addTreeTo(tree.position_index);
      numberOfTreesAdded += 1;

      position_indices.push(tree.position_index);
    }
  });

  if (mobileCheck()) {
    mirrorVR.notify('addTrees', position_indices);
  }
  return numberOfTreesAdded;
}

function addTreesRandomlyLoop({intervalLength = 500} = {}) {
  treeTimer = setInterval(addTreesRandomly, intervalLength);
}

/**************
 * COLLISIONS *
 **************/

const POSITION_Z_OUT_OF_SIGHT = 1;
const POSITION_Z_LINE_START = 0.6;
const POSITION_Z_LINE_END = 0.7;

AFRAME.registerComponent('player', {
  tick: function() {
    document.querySelectorAll('.tree').forEach(function(tree) {
      position = tree.getAttribute('position');
      tree_position_index = tree.getAttribute('data-tree-position-index');
      tree_id = tree.getAttribute('id');

      if (position.z > POSITION_Z_OUT_OF_SIGHT) {
        removeTree(tree);
      }

      if (!isGameRunning) return;

      if (POSITION_Z_LINE_START < position.z && position.z < POSITION_Z_LINE_END
          && tree_position_index == player_position_index) {
        gameOver();
      }

      if (position.z > POSITION_Z_LINE_END && !countedTrees.has(tree_id)) {
        addScoreForTree(tree_id);
        updateScoreDisplay();
      }
    })
  }
})

/*********
 * SCORE *
 *********/

var score;
var countedTrees;
var gameOverScoreDisplay;
var scoreDisplay;

function setupScore() {
  score = 0;
  countedTrees = new Set();
  scoreDisplay = document.getElementById('score');
  gameOverScoreDisplay = document.getElementById('game-score');
}

function teardownScore() {
  scoreDisplay.setAttribute('value', '');
  gameOverScoreDisplay.setAttribute('value', score);
}

function addScoreForTree(tree_id) {
  score += 1;
  countedTrees.add(tree_id);
}

function updateScoreDisplay() {
  scoreDisplay.setAttribute('value', score);
  if (mobileCheck()) {
    mirrorVR.notify('score', score);
  }
}

/********
 * MENU *
 ********/

var menuStart;
var menuGameOver;
var menuContainer;
var isGameRunning = false;
var startButton;
var restartButton;

function hideEntity(el) {
  el.setAttribute('visible', false);
}

function showEntity(el) {
  el.setAttribute('visible', true);
}

function setupAllMenus() {
  menuStart     = document.getElementById('start-menu');
  menuGameOver  = document.getElementById('game-over');
  menuContainer = document.getElementById('menu-container');
  startButton   = document.getElementById('start-button');
  restartButton = document.getElementById('restart-button');

  showStartMenu();

  startButton.addEventListener('click', function(evt) {
    startGame();
  })

  restartButton.addEventListener('click', function(evt) {
    startGame();
  })
}

function hideAllMenus() {
  hideEntity(menuContainer);
  startButton.classList.remove('clickable');
  restartButton.classList.remove('clickable');
}

function showGameOverMenu() {
  showEntity(menuContainer);
  hideEntity(menuStart);
  showEntity(menuGameOver);
  startButton.classList.remove('clickable');
  restartButton.classList.add('clickable');
}

function showStartMenu() {
  showEntity(menuContainer);
  hideEntity(menuGameOver);
  showEntity(menuStart);
  startButton.classList.add('clickable');
  restartButton.classList.remove('clickable');
}

/******
 * UI *
 ******/

function setupCursor() {
  if (!mobileCheck()) {
    var cursor = document.getElementById('cursor-mobile');
    hideEntity(cursor);
  }
}

setupControls();  // TODO: AFRAME.registerComponent has to occur before window.onload?

window.onload = function() {
  setupAllMenus();
  setupScore();
  setupTrees();
  setupInstructions();
  setupCursor();
  setupMirrorVR();
}
