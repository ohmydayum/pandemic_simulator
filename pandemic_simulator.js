// nabaz pandemic simulator
const _VERSION = "2.7.1";
const _EMAIL = "dor.israeli+pandemic_simulator@gmail.com";
const _CREDIT = "@dor";

/****************/
/*****CONFIG*****/
/**********  ******/
const DEFAULT_CONFIG = {
  "BEHAVIOUR": {
    "V_MAX": 4,
    "MAX_FORCE": 1,
    "PERCENTAGE_QUARANTINED": 0.5,
    "HYGIENE": 5,
  },
  "SOCIETY": {
    "HEALTHCARE_CAPACITY": 0.05,
    "POPULATION": 2000,
    "PERCENTAGE_INITIAL_SICKNESS": 0.01,
    "SIGHT": 8,
    "SEPERATION": 0.2,
    "COHESION": 0.07,
    "ALIGNMENT": 0.1,
    "OPENING": Math.PI/4,
  },
  "PANDEMIC": {
    "DEATH_PERCENTAGE": 0.2,
    "DAYS_OF_SICKNESS": 60,
    "PERCENTEAGE_BECOMING_CARRIER": 0.5,
    "PERCENTAGE_BECOMING_IMMUNE": 0.7,
    "DAYS_IMMUNE_PASS": 60,
  },
  "SIMULATION": {
    "RESULTION": 1,
    "GRAPH_DURATION": 500,
    "WINDOW_SIZE": 500,
    "SKIPS": 1,
  }
};

const HERD_BEHAVIOUR = {
  "BEHAVIOUR": {
    "V_MAX": 5,
    "PERCENTAGE_QUARANTINED": 0.1,
    "HYGIENE": 4,
  },
  "SOCIETY": {
  },
};

const SOCIAL_DISTANCING_BEHAVIOUR = {
  "BEHAVIOUR": {
    "V_MAX": 3,
    "PERCENTAGE_QUARANTINED": 0.9,
    "HYGIENE": 3.5,
  },
  "SOCIETY": {
    "SEPERATION": 0.3,
    "COHESION": 0.06
  },
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
  "SOCIETY": "#772277",
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
  if (ind%CONFIG.SIMULATION.SKIPS==0) {
    fill(255);
    stroke(0);
    rect(W_MIN - CONFIG.BEHAVIOUR.HYGIENE, W_MIN - CONFIG.BEHAVIOUR.HYGIENE, W_MAX + CONFIG.BEHAVIOUR.HYGIENE, W_MAX + CONFIG.BEHAVIOUR.HYGIENE)
  }
  counters = {}
  for (key in COLORS) {
    counters[key] = 0;
  }
  var tree = new kdTree(population, Organism.distance, ["x", "y"]);
  for (i = 0; i < CONFIG.SOCIETY.POPULATION; i++) {
    current_organism = population[i];
    infection_neighbours = tree.nearest(current_organism, 20, CONFIG.BEHAVIOUR.HYGIENE);
    for (j = 0; j < infection_neighbours.length; j++) {
      other_organism = infection_neighbours[j][0];
      is_infected_by = other_organism.get_touched_by(current_organism);
    }
    is_healthcare_collapsed = counters["sick"]/CONFIG.SOCIETY.POPULATION > CONFIG.SOCIETY.HEALTHCARE_CAPACITY;
    current_organism.update(is_healthcare_collapsed, CONFIG.SIMULATION.RESULTION);
    
    if (ind%CONFIG.SIMULATION.SKIPS==0) {
      draw_organism(current_organism);
    }
    let sight_neighbours = tree.nearest(current_organism, 20, CONFIG.SOCIETY.SIGHT);
    let f_seperation_x = 0;
    let f_seperation_y = 0;
    let f_cohesion_x = 0;
    let f_cohesion_y = 0;
    let f_alignment_x = 0;
    let f_alignment_y = 0;
    let insight = 1;
    // console.log(sight_neighbours.length)
    for (j = 0; j < sight_neighbours.length; j++) {
      let other_organism = sight_neighbours[j][0];
      let distance = sight_neighbours[j][1];
      if (current_organism == other_organism || !current_organism.can_see(other_organism, CONFIG.SOCIETY.OPENING) || other_organism.is_dead()) {
        continue;
      }
      insight++;
      f_seperation_x += (current_organism.x - other_organism.x)/distance;
      f_seperation_y += (current_organism.y - other_organism.y)/distance;
      f_cohesion_x += other_organism.x - current_organism.x;
      f_cohesion_y += other_organism.y - current_organism.y;
      f_alignment_x += other_organism.vx - current_organism.vx;
      f_alignment_y += other_organism.vy - current_organism.vy;
    }
    f_seperation_x /= insight;
    f_seperation_y /= insight;
    f_cohesion_x /= insight;
    f_cohesion_y /= insight;
    f_alignment_x /= insight;
    f_alignment_y /= insight;
    let fx = f_seperation_x * CONFIG.SOCIETY.SEPERATION + f_cohesion_x * CONFIG.SOCIETY.COHESION + f_alignment_x * CONFIG.SOCIETY.ALIGNMENT;
    fx = Math.max(-CONFIG.BEHAVIOUR.MAX_FORCE, Math.min(fx, CONFIG.BEHAVIOUR.MAX_FORCE));
    let fy = f_seperation_y * CONFIG.SOCIETY.SEPERATION + f_cohesion_y * CONFIG.SOCIETY.COHESION + f_alignment_y * CONFIG.SOCIETY.ALIGNMENT;
    fy = Math.max(-CONFIG.BEHAVIOUR.MAX_FORCE, Math.min(fy, CONFIG.BEHAVIOUR.MAX_FORCE));

    current_organism.move(CONFIG.SIMULATION.RESULTION, fx, fy);
    counters[current_organism.state] += 1;
  }

  draw_counters(counters);

  draw_graph(counters);
}

function draw_organism(o) {
  if (o.is_dead()) {
    fill(100, 100, 100, 50);
  } else {
    fill(COLORS[current_organism.state]); 
  }
  noStroke();
//   ellipse(current_organism.x, current_organism.y, CONFIG.BEHAVIOUR.HYGIENE, CONFIG.BEHAVIOUR.HYGIENE); 
  push();
  translate(o.x, o.y);
  rotate(o.get_angle() + radians(90));
  beginShape();
  vertex(0, -CONFIG.BEHAVIOUR.HYGIENE);
  vertex(-CONFIG.BEHAVIOUR.HYGIENE/2, CONFIG.BEHAVIOUR.HYGIENE);
  vertex(CONFIG.BEHAVIOUR.HYGIENE/2, CONFIG.BEHAVIOUR.HYGIENE);
  endShape(CLOSE);
  pop();
}

function run() {
  W_MIN = CONFIG.BEHAVIOUR.HYGIENE;
  W_MAX = CONFIG.SIMULATION.WINDOW_SIZE - CONFIG.BEHAVIOUR.HYGIENE;

  for (var category in CONFIG) {
    for (var key in CONFIG[category]) {
      CONFIG[category][key] = float(inputs[key].value());
    }
  }

  ind = 0;
  createCanvas(W_MAX + CONFIG.BEHAVIOUR.HYGIENE, W_MAX + CONFIG.BEHAVIOUR.HYGIENE + INFO_SIZE);
  background(255);

  H = 5 + 15 * Object.keys(COLORS).length;

  textSize(9);
  fill(100);
  noStroke();
  text(_CREDIT, W_MAX - _CREDIT.length * 5, W_MAX + INFO_SIZE);
  fill(255, 200);
  stroke(0);
  rect(110, W_MAX + 15, W_MAX - 103, H, 5);

  population = [];
  for (i = 0; i < CONFIG.SOCIETY.POPULATION; i++) {
    age = random(0, 100);
    x = random(W_MIN, W_MAX);
    y = random(W_MIN, W_MAX);
    angle = random(2*Math.PI);
    vx = random() * CONFIG.BEHAVIOUR.V_MAX * Math.cos(angle);
    vy = random() * CONFIG.BEHAVIOUR.V_MAX * Math.sin(angle);
    initial_state = "healthy";
    if (random() < CONFIG.SOCIETY.PERCENTAGE_INITIAL_SICKNESS) {
      initial_state = "sick";
    }
    current_organism = new Organism(age, x, y, vx, vy, initial_state);
    population.push(current_organism);
  }
}

function create_controls() {
  title = createElement("h1", "Pandemic Simulator v" + _VERSION);
  // subtitle = createElement("h4", "Next features: vaccines, tourists, barriers");
  credit = createA("mailto:" + _EMAIL, _CREDIT, "_blank");

  title.style("font-family", "arial");
  title.style("margin", "0px");
  // subtitle.style("font-family", "arial");
  // subtitle.style("margin", "0px");
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

  herd_button = createButton('Herd (UK)');

  herd_button.mousePressed(create_special_reset(HERD_BEHAVIOUR));

  lockdown_button = createButton('Social Distancing (China)');

  lockdown_button.mousePressed(create_special_reset(SOCIAL_DISTANCING_BEHAVIOUR));
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
    for (var key in DEFAULT_CONFIG[category]) {
      if (!(category in CONFIG)) {
        CONFIG[category] = {};
      }
      CONFIG[category][key] = float(inputs[key].value());
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
    rect(x, y_top, 200 / CONFIG.SIMULATION.GRAPH_DURATION, counters[key] / CONFIG.SOCIETY.POPULATION * H);
    y_top += counters[key] / CONFIG.SOCIETY.POPULATION * H;
  }
  fill(0);
  rect(x, (1 - CONFIG.SOCIETY.HEALTHCARE_CAPACITY - counters["quarantine"] / CONFIG.SOCIETY.POPULATION) * H + W_MAX + 15, 200 / CONFIG.SIMULATION.GRAPH_DURATION, 1);
}

function draw_act() {
  noStroke();
  ind+=2;
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

  can_see(other, opening_angle) {
    return Math.abs(this.get_angle_to(other) - this.get_angle()) < opening_angle;
  }

  move(dt, fx, fy) {
    if (this.state == "quarantine" || this.state == "dead") {
      return;
    }

    this.vx = Math.min(Math.max(-CONFIG.BEHAVIOUR.V_MAX, this.vx + dt * fx), CONFIG.BEHAVIOUR.V_MAX);
    this.vy = Math.min(Math.max(-CONFIG.BEHAVIOUR.V_MAX, this.vy + dt * fy), CONFIG.BEHAVIOUR.V_MAX);
    // this.x = (this.x + dt * this.vx + W_MAX - W_MIN) % W_MAX + W_MIN;
    // this.y = (this.y + dt * this.vy + W_MAX - W_MIN) % W_MAX + W_MIN;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x <= W_MIN || this.x >= W_MAX) {
      this.x = Math.max(W_MIN, Math.min(this.x, W_MAX));
      this.vx *= -1;
    }

    if (this.y <= W_MIN || this.y >= W_MAX) {
      this.y = Math.max(W_MIN, Math.min(this.y, W_MAX));
      this.vy *= -1;
    }
  }

  get_angle() {
    return Math.atan2(this.vy, this.vx);
  }


  get_angle_to(other) {
    return Math.atan2(other.y-this.y, other.x-this.x);
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
