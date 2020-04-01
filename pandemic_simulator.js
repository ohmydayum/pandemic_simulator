// nabaz pandemic simulator
const _VERSION = "2.7.4";
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
    "HEALTHCARE_CAPACITY": 0.001,
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
    "DAYS_OF_SICKNESS": 30,
    "PERCENTEAGE_BECOMING_CARRIER": 0.5,
    "PERCENTAGE_BECOMING_IMMUNE": 0.8,
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
var iteration_counter = 0;
var CONFIG = {};
var inputs = [];
var labels = [];
var datasets = [];


function setup() {
  create_controls();
  
  reset();
}

function draw() {
  counters = update_population(population);

  if (iteration_counter%CONFIG.SIMULATION.SKIPS==0) {
    draw_population(population);
    draw_rooms();
  }
  
  draw_counters(counters);
  draw_graph(counters);
  iteration_counter++;
}

// TODO
function draw_rooms() {

}

function draw_population(population) {
  fill(255);
  stroke(0);
  rect(W_MIN - CONFIG.BEHAVIOUR.HYGIENE, W_MIN - CONFIG.BEHAVIOUR.HYGIENE, W_MAX + CONFIG.BEHAVIOUR.HYGIENE, W_MAX + CONFIG.BEHAVIOUR.HYGIENE)
  
  for (i = 0; i < CONFIG.SOCIETY.POPULATION; i++) {
    current_organism = population[i];
    draw_organism(current_organism);
  }
}

function update_population(population) {
  counters = {}
  for (key in COLORS) {
    counters[key] = 0;
  }
  var tree = new kdTree(population, Organism.distance, ["x", "y"]);
  for (i = 0; i < CONFIG.SOCIETY.POPULATION; i++) {
    current_organism = population[i];
    
    let neighbours = tree.nearest(current_organism, 20, CONFIG.BEHAVIOUR.HYGIENE);
    let f_seperation_x = 0;
    let f_seperation_y = 0;
    let f_cohesion_x = 0;
    let f_cohesion_y = 0;
    let f_alignment_x = 0;
    let f_alignment_y = 0;
    let insight = 1;

    for (j = 0; j < neighbours.length; j++) {
      let other_organism = neighbours[j][0];
      other_organism.get_touched_by(current_organism);

      let distance = neighbours[j][1];
      if (current_organism == other_organism || !current_organism.can_see(other_organism, CONFIG.SOCIETY.SIGHT, CONFIG.SOCIETY.OPENING) || other_organism.is_dead()) {
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
    
    
    is_healthcare_collapsed = counters["sick"]/CONFIG.SOCIETY.POPULATION > CONFIG.SOCIETY.HEALTHCARE_CAPACITY;
    current_organism.update_health(is_healthcare_collapsed, CONFIG.SIMULATION.RESULTION);
    current_organism.move(CONFIG.SIMULATION.RESULTION, fx, fy);
    counters[current_organism.state] += 1;
  }
  return counters;
}

function draw_organism(o) {
  if (o.is_dead()) {
    fill(100, 100, 100, 50);
  } else {
    fill(COLORS[current_organism.state]); 
  }
  noStroke();
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
  
  iteration_counter = 0;
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
  
  var ctx = document.getElementById('graph').getContext('2d');
  ndays = 0;
  labels = Array(ndays).fill().map((_,i)=>i);
  datasets = [];
  for (let i = 0; i < Object.keys(COLORS).length; i++) {
    key = Object.keys(COLORS)[i];
    dataset = {
      label: 'set ' + key,
      backgroundColor: COLORS[key],
      data: Array.from({length: ndays}, () => Math.floor(Math.random() * 10000)),
    };
    datasets.push(dataset);
  }
  barChartData = {
    labels: labels,
    datasets: datasets,
  }
  Chart.defaults.global.elements.point.radius=0;
  window.myBar = new Chart(ctx, {
    type: 'line',
    data: barChartData,
    options: {
      title: {
        display: true,
        text: 'Pandemic Simulation'
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true,
        }],
        yAxes: [{
          stacked: true
        }]
      }
    }
  });

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
  noStroke();
  
  x = 110 + 200 / CONFIG.SIMULATION.GRAPH_DURATION * iteration_counter;
  y_top = W_MAX + 15;
  for (key in counters) {
    fill(COLORS[key]);
    rect(x, y_top, 200 / CONFIG.SIMULATION.GRAPH_DURATION, counters[key] / CONFIG.SOCIETY.POPULATION * H);
    y_top += counters[key] / CONFIG.SOCIETY.POPULATION * H;
  }
  fill(0);
  rect(x, (1 - CONFIG.SOCIETY.HEALTHCARE_CAPACITY - counters["quarantine"] / CONFIG.SOCIETY.POPULATION) * H + W_MAX + 15, 200 / CONFIG.SIMULATION.GRAPH_DURATION, 1);
  
  N = 500;
  if (barChartData.labels) {
    barChartData.labels.push(iteration_counter);
    if (barChartData.labels.length==N) {
      barChartData.labels.shift();
    }
    for (var index = 0; index < barChartData.datasets.length; ++index) {
      barChartData.datasets[index].data.push(-counters[Object.keys(counters)[index]]);
      
      if (barChartData.datasets[index].data.length==N) {
        barChartData.datasets[index].data.shift();
      }
    }
    
    window.myBar.update();
  }
}

function draw_act() {
  noStroke();
  iteration_counter+=2;
}
