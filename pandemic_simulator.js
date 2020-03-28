// nabaz pandemic simulator
const _VERSION = "2.5.1";
const _EMAIL = "dor.israeli+pandemic_simulator@gmail.com";
const _CREDIT = "@dor";

/****************/
/*****CONFIG*****/
/**********  ******/
const DEFAULT_CONFIG = {
  "BEHAVIOUR": {
    "V_MAX": 5,
    "MAX_INPATIENT_BEDS": 300,
    "PERCENTAGE_QUARANTINED": 0.5,
  },
  "POPULATION": {
    "PERCENTAGE_NOT_MOVING": 0.1,
    "POPULATION": 3000,
    "PERCENTAGE_INITIAL_SICKNESS": 0.01,
  },
  "PANDEMIC": {
    "DEATH_PERCENTAGE": 0.2,
    "DAYS_OF_SICKNESS": 60,
    "PERCENTEAGE_BECOMING_CARRIER": 0.5,
    "PERCENTAGE_BECOMING_IMMUNE": 0.7,
    "DAYS_IMMUNE_PASS": 120,
  },
  "SIMULATION": {
    "DT": 1,
    "ORGANISM_SIZE": 5,
    "GRAPH_DURATION": 500,
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
  "POPULATION": "#772277",
  "PANDEMIC": "#ff4444",
  "SIMULATION": "#448844",
};
const INFO_SIZE = 40 + 15 * Object.keys(COLORS).length;

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
  for (i = 0; i < CONFIG.POPULATION.POPULATION; i++) {
    current_organism = population[i];
    neighbours = tree.nearest(current_organism, 20, CONFIG.SIMULATION.ORGANISM_SIZE);
    for (j = 0; j < neighbours.length; j++) {
      other_organism = neighbours[j][0];
      is_infected_by = other_organism.get_touched_by(current_organism);
    }
    is_healthcare_collapsed = counters["sick"] > CONFIG.BEHAVIOUR.MAX_INPATIENT_BEDS;
    current_organism.update(is_healthcare_collapsed, CONFIG.SIMULATION.DT);
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

  textSize(9);
  fill(100);
  noStroke();
  text(_CREDIT, W_MAX - _CREDIT.length * 4.5, W_MAX + INFO_SIZE);
  fill(255, 200);
  stroke(0);
  rect(110, W_MAX + 15, W_MAX - 103, H, 5);

  population = [];
  for (i = 0; i < CONFIG.POPULATION.POPULATION; i++) {
    age = random(0, 100);
    x = random(W_MIN, W_MAX);
    y = random(W_MIN, W_MAX);
    is_not_moving = random() < CONFIG.POPULATION.PERCENTAGE_NOT_MOVING;
    initial_state = "healthy";
    if (random() < CONFIG.POPULATION.PERCENTAGE_INITIAL_SICKNESS) {
      initial_state = "sick";
    }
    current_organism = new Organism(age, x, y, is_not_moving, initial_state);
    population.push(current_organism);
  }
}

function create_controls() {
  title = createElement("h1", "Pandemic Simulator v" + _VERSION);
  subtitle = createElement("h4", "Next features: vaccines, tourists, barriers");
  credit = createA("mailto:" + _EMAIL, _CREDIT, "_blank");

  title.style("font-family", "arial");
  title.style("margin", "0px");
  subtitle.style("font-family", "arial");
  subtitle.style("margin", "0px");
  credit.style("font-family", "arial");

  createElement("hr");
  for (var category in DEFAULT_CONFIG) {
    category_color = CONFIG_CATEGORY_COLORS[category];
    createDiv("<b style='font-family:arial'>" + category + " configuration: </b>");
    for (var key in DEFAULT_CONFIG[category]) {
      current_input_label = createElement("span", key + "=");
      current_input_label.size(100, 15);
      current_input_label.attribute("style", "font-family:arial;color:white;background-color:" + category_color);
      current_input = createInput(str(DEFAULT_CONFIG[category][key]));
      // current_input.size(30, 15);
      current_input.attribute("style", "margin-right:1%;width:2%");
      inputs[key] = current_input;
      // createElement("br","");
    }

    createElement("hr");

  }
  createDiv();
  act_button = createButton('Apply behaviour');
  act_button.mousePressed(act);

  run_button = createButton('Restart \\w config');
  run_button.mousePressed(run);

  reset_button = createButton('Reset');
  reset_button.mousePressed(reset);

  herd_button = createButton('UK (Herd)');
  herd_config = {
    "BEHAVIOUR": {
      "V_MAX": 7,
      "PERCENTAGE_QUARANTINED": 0.01,
    },
  };
  herd_button.mousePressed(create_special_reset(herd_config));

  lockdown_button = createButton('China (Lockdown)');
  lockdown_config = {
    "BEHAVIOUR": {
      "V_MAX": 4,
      "PERCENTAGE_QUARANTINED": 0.9,
    },
  };
  lockdown_button.mousePressed(create_special_reset(lockdown_config));
}

function create_special_reset(config) {
  function special_reset() {
    for (var category in DEFAULT_CONFIG) {
      for (var key in DEFAULT_CONFIG[category]) {
        if (!(category in CONFIG)) {
          CONFIG[category] = {};
        }
        CONFIG[category][key] = DEFAULT_CONFIG[category][key];
        inputs[key].value(DEFAULT_CONFIG[category][key]);
      }
    }
    for (var category in config) {
      for (var key in config[category]) {
        if (!(category in CONFIG)) {
          CONFIG[category] = {};
        }
        CONFIG[category][key] = config[category][key];
        inputs[key].value(config[category][key]);
      }
    }
    run();
  }
  return special_reset;
}

function reset() {
  for (var category in DEFAULT_CONFIG) {
    for (var key in DEFAULT_CONFIG[category]) {
      if (!(category in CONFIG)) {
        CONFIG[category] = {};
      }
      CONFIG[category][key] = DEFAULT_CONFIG[category][key];
      inputs[key].value(DEFAULT_CONFIG[category][key]);
    }
  }
  run();
}

function act() {
  for (var category in DEFAULT_CONFIG) {
    if (category != "BEHAVIOUR") {
      continue;
    }
    for (var key in DEFAULT_CONFIG[category]) {
      if (!(category in CONFIG)) {
        CONFIG[category] = {};
      }
      CONFIG[category][key] = inputs[key].value();
    }
  }
  
  draw_act();
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
    rect(x, y_top, 200 / CONFIG.SIMULATION.GRAPH_DURATION, counters[key] / CONFIG.POPULATION.POPULATION * H);
    y_top += counters[key] / CONFIG.POPULATION.POPULATION * H;
  }
  fill(0);
  rect(x, (1 - CONFIG.BEHAVIOUR.MAX_INPATIENT_BEDS / CONFIG.POPULATION.POPULATION - counters["quarantine"] / CONFIG.POPULATION.POPULATION) * H + W_MAX + 15, 200 / CONFIG.SIMULATION.GRAPH_DURATION, 1);
}

function draw_act() {
  noStroke();
  ind+=2;
}

class Organism {
  constructor(age, x, y, is_not_moving, initial_state) {
    this.age = age;
    this.x = x;
    this.y = y;
    this.is_not_moving = is_not_moving;
    this.state = initial_state;
    this.days_sick = 0;
    this.days_immune = 0;
  }

  move(dt) {
    if (is_not_moving || this.state == "quarantine" || this.state == "dead") {
      return;
    }

    let v = dt * random() * CONFIG.BEHAVIOUR.V_MAX;
    let a = random() * 2 * Math.PI;
    let vx = v * Math.cos(a);
    let vy = v * Math.sin(a);

    this.x += dt * vx;
    this.y += dt * vy;

    if (this.x <= W_MIN || this.x >= W_MAX) {
      this.x = Math.max(W_MIN, Math.min(this.x, W_MAX));
    }

    if (this.y <= W_MIN || this.y >= W_MAX) {
      this.y = Math.max(W_MIN, Math.min(this.y, W_MAX));
    }
  }

  get_touched_by(other) {
    if ((other.state == "sick" || other.state == "carrier") && this.state == "healthy") {
      if (random() < CONFIG.PANDEMIC.PERCENTEAGE_BECOMING_CARRIER) {
        this.become_carrier();
      } else if (random() < CONFIG.BEHAVIOUR.PERCENTAGE_QUARANTINED) {
        this.become_quarantine();
      } else {
        this.become_sick();
      }
      return true;
    }
    return false;
  }

  update(is_healthcare_collapsed, dt) {
    this.days_immune += dt;
    if (this.state == "immune" && this.days_immune > CONFIG.PANDEMIC.DAYS_IMMUNE_PASS) {
      this.become_healthy()
      return;
    }

    if (!(this.state == "carrier" || this.state == "quarantine" || this.state == "sick")) {
      return;
    }

    this.days_sick += dt;
    if (this.days_sick < CONFIG.PANDEMIC.DAYS_OF_SICKNESS) {
      return;
    }

    let p = (CONFIG.PANDEMIC.DEATH_PERCENTAGE * this.age / 100) ** 2;
    if (is_healthcare_collapsed || random() < 1 - Math.pow(1 - p, dt)) {
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

  is_dead() {
    return this.state == "dead";
  }

  static distance(o1, o2) {
    return ((o1.x - o2.x) ** 2 + (o1.y - o2.y) ** 2) ** 0.5;
  }
}
