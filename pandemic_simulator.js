const _VERSION = "2.1.0"

/****************/
/*****CONFIG*****/
/****************/
const DEFAULT_CONFIG = {
  "BEHAVIOUR": {
    "V_MAX": 2,
    "PERCENTAGE_NOT_MOVING": 0.1,
    "POPULATION": 1000,
  },
  "PANDEMIC": {
    "DEATH_PERCENTAGE": 0.2,
    "DAYS_OF_SICKNESS": 30,
    "PERCENTAGE_INITIAL_SICKNESS": 0.01,
    "PERCENTEAGE_BECOMING_CARRIER": 0.5,
    "PERCENTAGE_BECOMING_IMMUNE": 0.7,
    "DAYS_IMMUNE_PASS": 120,
    "PERCENTAGE_QUARANTINED": 0.5,
  },
  "SIMULATION": {
    "DT": 1,
    "ORGANISM_SIZE": 7,
    "GRAPH_DURATION": 1000,
    "WINDOW_SIZE": 500,
  }
};

////////////////////////

const COLORS = {
  "dead": "gray",
  "healthy": "green",
  "immune": "blue",
  "carrier": "brown",
  "sick": "red",
  "quarantine": "black",
};

const CONFIG_CATEGORY_COLORS = {
  "BEHAVIOUR": "#4444ff",
  "PANDEMIC": "#ff4444",
  "SIMULATION": "#448844",
};
const INFO_SIZE = 60 + 15 * Object.keys(COLORS).length;

var population;
var ind;
var CONFIG = {};
var inputs = [];

function setup() {
  create_controls();

  reset();
}

function draw() {
  fill(255);
  stroke(0);
  rect(W_MIN - CONFIG.SIMULATION.ORGANISM_SIZE, W_MIN - CONFIG.SIMULATION.ORGANISM_SIZE, W_MAX + CONFIG.SIMULATION.ORGANISM_SIZE, W_MAX + CONFIG.SIMULATION.ORGANISM_SIZE)

  counters = {}
  for (key in COLORS) {
    counters[key] = 0;
  }
  var tree = new kdTree(population, Organism.distance, ["x", "y"]);
  for (i = 0; i < CONFIG.BEHAVIOUR.POPULATION; i++) {
    current_organism = population[i];
    neighbours = tree.nearest(current_organism, 20, CONFIG.SIMULATION.ORGANISM_SIZE);
    for (j = 0; j < neighbours.length; j++) {
      other_organism = neighbours[j][0];
      current_organism.get_touched_by(other_organism);
      other_organism.get_touched_by(current_organism);
    }
    current_organism.update();
    fill(COLORS[current_organism.state]);
    noStroke();
    ellipse(current_organism.x, current_organism.y, CONFIG.SIMULATION.ORGANISM_SIZE, CONFIG.SIMULATION.ORGANISM_SIZE);
    current_organism.move(CONFIG.SIMULATION.DT);
    counters[current_organism.state] += 1;
  }
  draw_counters(counters);

  draw_graph(counters);
}

function run() {
  W_MIN = CONFIG.SIMULATION.ORGANISM_SIZE;
  W_MAX = CONFIG.SIMULATION.WINDOW_SIZE - CONFIG.SIMULATION.ORGANISM_SIZE;

  for (var category in CONFIG) {
    for (var key in CONFIG[category]) {
      CONFIG[category][key] = float(inputs[key].value());
    }
  }

  ind = 0;
  createCanvas(W_MAX + CONFIG.SIMULATION.ORGANISM_SIZE, W_MAX + CONFIG.SIMULATION.ORGANISM_SIZE + INFO_SIZE);
  background(255);

  H = 5 + 15 * Object.keys(COLORS).length;

  textSize(16);
  fill(100);
  noStroke();
  text("Pandemic Simulator v" + _VERSION, 5, W_MAX + 35 + H);
  textSize(10);
  text("Next features: vaccines, tourists, barriers", 5, W_MAX + 50 + H);

  textSize(9);
  fill(100);
  noStroke();
  text("@dor", W_MAX - 5 * 4, W_MAX + INFO_SIZE);

  fill(255, 200);
  stroke(0);
  rect(110, W_MAX + 15, W_MAX - 103, H, 5);

  population = [];
  for (i = 0; i < CONFIG.BEHAVIOUR.POPULATION; i++) {
    age = random(0, 100);
    x = random(W_MIN, W_MAX);
    y = random(W_MIN, W_MAX);
    vx = random(-CONFIG.BEHAVIOUR.V_MAX, CONFIG.BEHAVIOUR.V_MAX);
    vy = random(-CONFIG.BEHAVIOUR.V_MAX, CONFIG.BEHAVIOUR.V_MAX);
    if (random() < CONFIG.BEHAVIOUR.PERCENTAGE_NOT_MOVING) {
      vx = 0;
      vy = 0;
    }
    initial_state = "healthy";
    if (random() < CONFIG.PANDEMIC.PERCENTAGE_INITIAL_SICKNESS) {
      initial_state = "sick";
    }
    current_organism = new Organism(age, x, y, vx, vy, initial_state);
    population.push(current_organism);
  }
}

function create_controls() {
  for (var category in DEFAULT_CONFIG) {
    category_color = CONFIG_CATEGORY_COLORS[category];
    for (var key in DEFAULT_CONFIG[category]) {
      current_input_label = createInput(key);
      current_input_label.size(100, 15);
      current_input_label.attribute("disabled", "disabled");
      current_input_label.attribute("style", "color:white;background-color:"+category_color);
      current_input = createInput(str(DEFAULT_CONFIG[category][key]));
      current_input.size(30, 15);
      inputs[key] = current_input;
    }
    createDiv();
  }

  run_button = createButton('Run!');
  run_button.mousePressed(run);


  reset_button = createButton('Reset');
  reset_button.mousePressed(reset);
}

function reset() {
  for (var category in DEFAULT_CONFIG) {
    for (var key in DEFAULT_CONFIG[category]) {
      if(!(category in CONFIG)) {
        CONFIG[category] = {}; 
      }
      CONFIG[category][key] = DEFAULT_CONFIG[category][key];
      inputs[key].value(DEFAULT_CONFIG[category][key]);
    }
  }
  run();
}

function draw_counters(counters) {
  fill(255, 200);
  stroke(0);
  rect(5, W_MAX + 15, 100, 5 + 15 * Object.keys(COLORS).length, 5);
  noStroke();
  textSize(12);
  i = 1;
  for (var key in counters) {
    fill(COLORS[key]);
    text(key + ": " + counters[key], 10, W_MAX + 15 + 15 * i++);
  }
}

function draw_graph(counters) {
  ind++;
  noStroke();

  x = 110 + 200 / CONFIG.SIMULATION.GRAPH_DURATION * ind;
  y_top = W_MAX + 15;
  for (key in counters) {
    fill(COLORS[key]);
    rect(x, y_top, 200 / CONFIG.SIMULATION.GRAPH_DURATION, counters[key] / CONFIG.BEHAVIOUR.POPULATION * H);
    y_top += counters[key] / CONFIG.BEHAVIOUR.POPULATION * H;
  }
}

class Organism {
  constructor(age, x, y, vx, vy, initial_state) {
    this.age = age;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.state = initial_state;
    this.days_sick = 0;
    this.days_immune = 0;
  }

  move(dt) {
    if (this.state == "quarantine") {
      return;
    }

    this.x += dt * this.vx;
    this.y += dt * this.vy;

    if (this.x <= W_MIN || this.x >= W_MAX) {
      this.vx *= -1;
      this.x = Math.max(W_MIN, Math.min(this.x, W_MAX));
    }

    if (this.y <= W_MIN || this.y >= W_MAX) {
      this.vy *= -1;
      this.y = Math.max(W_MIN, Math.min(this.y, W_MAX));
    }
  }

  get_touched_by(other) {
    if ((other.state == "sick" || other.state == "carrier") && this.state == "healthy") {
      if (random() < CONFIG.PANDEMIC.PERCENTEAGE_BECOMING_CARRIER) {
        this.become_carrier();
      } else if (random() < CONFIG.PANDEMIC.PERCENTAGE_QUARANTINED) {
        this.become_quarantine();
      } else {
        this.become_sick();
      }
    }
  }

  update() {
    if (this.state == "immune" && this.days_immune++ > CONFIG.PANDEMIC.DAYS_IMMUNE_PASS) {
      this.become_healthy()
      return;
    }

    if (!(this.state == "carrier" || this.state == "quarantine" || this.state == "sick")) {
      return;
    }

    if (this.days_sick++ < CONFIG.PANDEMIC.DAYS_OF_SICKNESS) {
      return;
    }

    if (random() < (CONFIG.PANDEMIC.DEATH_PERCENTAGE * this.age / 100) ** 2) {
      this.become_dead();
    } else if (random() < CONFIG.PANDEMIC.PERCENTAGE_BECOMING_IMMUNE) {
      this.become_immune();
    } else {
      this.become_healthy();
    }
  }

  become_immune() {
    this.state = "immune";
    this.days_immune = 0;
  }

  become_carrier() {
    this.days_sick = 0;
    this.state = "carrier";
  }

  become_quarantine() {
    this.days_sick = 0;
    this.state = "quarantine";
  }

  become_healthy() {
    this.days_sick = 0;
    this.state = "healthy";
  }

  become_sick() {
    this.state = "sick";
    this.days_sick = 0;
  }

  become_dead() {
    this.state = "dead";
    this.vx = 0;
    this.vy = 0;
  }

  static distance(o1, o2) {
    return ((o1.x - o2.x) ** 2 + (o1.y - o2.y) ** 2) ** 0.5;
  }
}
