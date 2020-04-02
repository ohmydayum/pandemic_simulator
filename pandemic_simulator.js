const _VERSION = "3.2.5";
const _EMAIL = "dor.israeli+pandemic_simulator@gmail.com";

const DEFAULT_SOCIETY_CONFIG = new Society(V_MAX= 4, MAX_FORCE= 1, PERCENTAGE_QUARANTINED= 0.5, HYGIENE= 5, POPULATION= 2000, PERCENTAGE_INITIAL_SICKNESS= 0.01, SIGHT= 8, SEPERATION= 0.2, COHESION= 0.07, ALIGNMENT= 0.1, OPENING= Math.PI/4);
const CRAZY_SOCIETY_CONFIG = new Society(V_MAX= 7, MAX_FORCE= 2, PERCENTAGE_QUARANTINED= 0.5, HYGIENE= 20, POPULATION= 10, PERCENTAGE_INITIAL_SICKNESS= 0.01, SIGHT= 8, SEPERATION= 0.2, COHESION= 0.07, ALIGNMENT= 0.1, OPENING= Math.PI/4);
const DEFAULT_PANDEMIC_CONFIG = new Pandemic(DEATH_PERCENTAGE= 0.2, DAYS_OF_SICKNESS= 30, PERCENTEAGE_BECOMING_CARRIER= 0.5, PERCENTAGE_BECOMING_IMMUNE= 0.8, DAYS_IMMUNE_PASS= 60)
const DEFAULT_SIMULATION_CONFIG = new Simulation(RESULTION= 1, GRAPH_DURATION= 500, CANVAS_WIDTH= $(window).width()*3/4, CANVAS_HEIGHT= $(window).height()*3/4, SKIPS= 1)
const DEFAULT_WORLD_CONFIG = new World(HEALTHCARE_CAPACITY= 0.001)
const DEFAULT_CONFIG = new Configuration(_VERSION, [DEFAULT_SOCIETY_CONFIG, CRAZY_SOCIETY_CONFIG, ], DEFAULT_WORLD_CONFIG, DEFAULT_PANDEMIC_CONFIG, DEFAULT_SIMULATION_CONFIG);

function _deepClone(obj) {
  if (obj === null || typeof obj !== "object")
  return obj
  var props = Object.getOwnPropertyDescriptors(obj)
  for (var prop in props) {
    props[prop].value = _deepClone(props[prop].value)
  }
  return Object.create(Object.getPrototypeOf(obj), props);
}

var config;

function deserialize_config(s) {
  return JSON.parse(atob(decodeURIComponent(s)));
}

const HERD_SOCIETY = {
  "V_MAX": 10,
  "PERCENTAGE_QUARANTINED": 0.1,
  "HYGIENE": 6,
};

const SOCIAL_DISTANCING_SOCIETY = {
  "V_MAX": 3,
  "PERCENTAGE_QUARANTINED": 0.9,
  "HYGIENE": 3.5,
  "SEPERATION": 0.3,
  "COHESION": 0.06,
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
  "SOCIETY": "#4444ff",
  "SOCIETY": "#772277",
  "PANDEMIC": "#ff4444",
  "SIMULATION": "#448844",
};
const INFO_SIZE = 40 + 15 * Object.keys(COLORS).length;

var population = [];
var ind;
var config = {};
var inputs = [];

function setup() {
  create_header();
  let canvas = createCanvas(1, 1);
  canvas.parent('simulation-holder');
  create_buttons();
  var queryString = window.location.search;
  var urlParams = new URLSearchParams(queryString);
  if (urlParams.has("config")) {
    s = urlParams.get("config");
    try{
      config = deserialize_config(s);
      $("#modal_configuration_loaded").modal('show');
    } catch {
      $("#modal_configuration_not_loaded").modal('show');
      config = _deepClone(DEFAULT_CONFIG);
    }
  } else {
    config = _deepClone(DEFAULT_CONFIG);
  }
  run();
}

function create_header() {
  title = document.getElementById("title");
  title.innerText += "Pandemic Simulator v" + _VERSION;
  // title.style = "font-family:arial;margin:0px;";
  // title.classList.add("navbar-brand");
  // document.getElementById("header").appendChild(title);
  
  // credit = document.createElement("a");
  // credit.href = "mailto:" + _EMAIL;
  // credit.innerHTML = "<span class='glyphicon glyphicon-envelope'></span> dor";
  // // credit.style = "font-family:arial;margin:0px;";
  // document.getElementById("fluid").appendChild(credit);
}

function draw() {
  if (ind++%config.simulation.SKIPS==0) {
    fill(255);
    rect(0, 0, config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  }
  counters = {}
  for (key in COLORS) {
    counters[key] = 0;
  }
  var tree = new kdTree(population, Organism.distance, ["x", "y"]);
  for (i = 0; i < population.length ; i++) {
    current_organism = population[i];
    infection_neighbours = tree.nearest(current_organism, 20, current_organism.society.HYGIENE);
    for (j = 0; j < infection_neighbours.length; j++) {
      other_organism = infection_neighbours[j][0];
      is_infected_by = other_organism.get_touched_by(current_organism, config.pandemic);
    }
    is_healthcare_collapsed = counters["sick"]/population.length > config.world.HEALTHCARE_CAPACITY;
    current_organism.update_health(config.pandemic, is_healthcare_collapsed, config.simulation.RESULTION);
    
    if (ind%config.simulation.SKIPS==0) {
      draw_organism(current_organism);
    }
    let sight_neighbours = tree.nearest(current_organism, 20, current_organism.society.SIGHT);
    let f_seperation_x = 0;
    let f_seperation_y = 0;
    let f_cohesion_x = 0;
    let f_cohesion_y = 0;
    let f_alignment_x = 0;
    let f_alignment_y = 0;
    let insight = 1;
    
    for (j = 0; j < sight_neighbours.length; j++) {
      let other_organism = sight_neighbours[j][0];
      let distance = sight_neighbours[j][1];
      if (current_organism == other_organism || !current_organism.can_see(other_organism) || other_organism.is_dead()) {
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
    let fx = f_seperation_x * current_organism.society.SEPERATION + f_cohesion_x * current_organism.society.COHESION + f_alignment_x * current_organism.society.ALIGNMENT;
    fx = Math.max(-current_organism.society.MAX_FORCE, Math.min(fx, current_organism.society.MAX_FORCE));
    let fy = f_seperation_y * current_organism.society.SEPERATION + f_cohesion_y * current_organism.society.COHESION + f_alignment_y * current_organism.society.ALIGNMENT;
    fy = Math.max(-current_organism.society.MAX_FORCE, Math.min(fy, current_organism.society.MAX_FORCE));
    
    current_organism.move(config.simulation.RESULTION, fx, fy, config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
    counters[current_organism.state] += 1;
  }
  
  update_chart(line_chart, counters, line_series);
  counters_percents = {};
  for (let i = 0; i < Object.keys(counters).length; i++) {
    counters_percents[Object.keys(counters)[i]] = (Object.values(counters)[i]/Object.keys(population).length*100).toFixed(2);
    // console.log(Object.keys(counters)[i], counters_percents[Object.keys(counters)[i]])
  }
  update_chart(stacked_chart, counters_percents, stacked_series);
}

function create_chart(id, type, groups, series, title) {
  for (let i = 0; i < Object.keys(COLORS).length; i++) {
    series.push({			
      type: type,
      showInLegend: true,
      name: Object.keys(COLORS)[i],
      dataPoints: [],
    });
  }
  // var c = document.getElementById(id).getContext("2d");
  // console.log(type, c);
  var chart = new CanvasJS.Chart(id, {
    theme: "light2",
    title: {
      text: title
    },
    scales: {
      xAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: 'Time [arbitrary units]'
        }
      }],
      yAxes: [{
        display: true,
        ticks: {
          beginAtZero: true,
          max: population.length
        }
      }]
    },
    legend: {
      cursor:"pointer",
      verticalAlign: "top",
      fontSize: 14,
      fontColor: "dimGrey",
      itemclick : toggleDataSeries
    },
    data: series,
  });
  return chart;
}

function toggleDataSeries(e) {
  if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
    e.dataSeries.visible = false;
  }
  else {
    e.dataSeries.visible = true;
  }
  chart.render();
}

function update_chart(chart, counters, series) {
  for (var i = 0; i < Object.keys(counters).length; i++) {
    series[i].legendText = Object.keys(counters)[i] + " " + Object.values(counters)[i];
    series[i].dataPoints.push({
      x: ind,
      y: float(Object.values(counters)[i])
    });
  }
  chart.render();
}

function draw_organism(o) {
  if (o.is_dead()) {
    fill(100, 100, 100, 50);
  } else {
    fill(COLORS[current_organism.state]); 
  }
  noStroke();
  //   ellipse(current_organism.x, current_organism.y, config.society.HYGIENE, config.society.HYGIENE); 
  push();
  translate(o.x, o.y);
  rotate(o.get_angle() + radians(90));
  beginShape();
  vertex(0, -o.society.HYGIENE);
  vertex(-o.society.HYGIENE/2, o.society.HYGIENE);
  vertex(o.society.HYGIENE/2, o.society.HYGIENE);
  endShape(CLOSE);
  pop();
}

function restart_with_input_config() {
  apply_config_changes();
  run();
}

var line_chart;
var stacked_chart;
var line_series;
var stacked_series;
function run() {
  ind = 0;
  create_configuration_controls();
  resizeCanvas(config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  
  
  line_series = [];
  stacked_series = []
  stacked_chart = create_chart("stacked_chart", "stackedArea100", COLORS, stacked_series, "Stacked Segmentation VS time");
  line_chart = create_chart("line_chart", "line", COLORS, line_series, "Groups sizes VS time");
  
  H = 5 + 15 * Object.keys(COLORS).length;
  
  population = [];
  Object.values(config.societies).forEach(society => {
    for (i = 0; i < society.POPULATION; i++) {
      age = Math.ceil(random(0, 100));
      x = random(config.simulation.CANVAS_WIDTH);
      y = random(config.simulation.CANVAS_HEIGHT);
      angle = random(2*Math.PI);
      vx = random() * society.V_MAX * Math.cos(angle);
      vy = random() * society.V_MAX * Math.sin(angle);
      initial_state = "healthy";
      if (random() < society.PERCENTAGE_INITIAL_SICKNESS) {
        initial_state = "sick";
      }
      current_organism = new Organism(age, x, y, vx, vy, initial_state, society);
      population.push(current_organism);
    }
  });
}

function create_configuration_controls() {  
  document.getElementById("configurations").innerHTML = "";
  inputs = [];
  inputs["society"] = {};
  for (let society_index = 0; society_index < Object.keys(config.societies).length; society_index++) {
    current_society_div = document.createElement("div");
    current_society_div.classList.add("panel");
    current_society_div.classList.add("panel-primary");
    var society_color = "blue";
    heading = document.createElement("div")
    heading.classList.add("panel-heading");
    // heading.style="font-weight:bold";
    heading.innerText = "Society #" + (society_index+1) + " (out of " + Object.keys(config.societies).length + ") configuration:";
    current_society_div.appendChild(heading);
    
    body = document.createElement("div")
    body.classList.add("panel-body");
    current_society_div.appendChild(body);
    inputs["society"][society_index] = {};
    society = config.societies[society_index];
    for (const key in society) {
      input_id = "society_"+society_index+"_"+key+"_input";
      current_input_label = document.createElement("label");
      current_input_label.htmlFor = input_id;
      current_input_label.innerText = key;
      // current_input_label.width = 100;
      // current_input_label.height = 50;
      // current_input_label.style = "font-family:arial;color:white;background-color:" + society_color;
      current_input = document.createElement("input");
      current_input.id = input_id;
      current_input.classList.add("form-control");
      current_input.value = str(society[key]);
      // current_input.style = "margin-right:1%;width:2%";
      inputs["society"][society_index][key] = current_input;
      body.appendChild(current_input_label);
      body.appendChild(current_input);
    }
    document.getElementById('configurations').appendChild(current_society_div)
  }
  
  pandemic_div = document.createElement("div");
  pandemic_div.classList.add("panel");
  pandemic_div.classList.add("panel-danger");
  heading = document.createElement("div");
  heading.classList.add("panel-heading");
  // heading.style="font-weight:bold";
  heading.innerText = "Pandemic configuration:";
  pandemic_div.appendChild(heading);
  pandemic_color = "red";
  body = document.createElement("div")
  body.classList.add("panel-body");
  pandemic_div.appendChild(body);
  inputs["pandemic"] = {};
  Object.keys(config.pandemic).forEach(key => {
    input_id = "pandemic_"+key+"_input";
    current_input_label = document.createElement("label");
    current_input_label.innerText = key;
    // current_input_label.width = 100;
    // current_input_label.height = 50;
    // current_input_label.style = "font-family:arial;color:white;background-color:" + pandemic_color;
    current_input = document.createElement("input");
    current_input.classList.add("form-control");
    current_input.id = input_id;
    current_input_label.htmlFor = input_id;
    current_input.value = str(config.pandemic[key]);
    // current_input.style = "margin-right:1%;width:2%";
    // current_input.style = "margin-right:1%;width:2%";
    inputs["pandemic"][key] = current_input;
    body.appendChild(current_input_label);
    body.appendChild(current_input);
  });
  document.getElementById('configurations').appendChild(pandemic_div);
  
  simulation_div = document.createElement("div");
  simulation_div.classList.add("panel");
  simulation_div.classList.add("panel-info");
  heading = document.createElement("div");
  heading.classList.add("panel-heading");
  // heading.style="font-weight:bold";
  heading.innerText = "Simulation configuration:";
  simulation_div.appendChild(heading);
  // simulation_color = "green";
  body = document.createElement("div")
  body.classList.add("panel-body");
  simulation_div.appendChild(body);
  inputs["simulation"] = {};
  Object.keys(config.simulation).forEach(key => {
    current_input_label = document.createElement("label");
    current_input_label.innerText = key;
    // current_input_label.width = 100;
    // current_input_label.height = 50;
    // current_input_label.style = "font-family:arial;color:white;background-color:" + simulation_color;
    current_input = document.createElement("input");
    current_input.classList.add("form-control");
    current_input.id = input_id;
    current_input_label.htmlFor = input_id;
    current_input.value = str(config.simulation[key]);
    // current_input.style = "margin-right:1%;width:2%";
    // current_input.style = "margin-right:1%;width:2%";
    inputs["simulation"][key] = current_input;
    body.appendChild(current_input_label);
    body.appendChild(current_input);
  });
  document.getElementById('configurations').appendChild(simulation_div);
  
  
  world_div = document.createElement("div");
  world_div.classList.add("panel");
  world_div.classList.add("panel-warning");
  heading = document.createElement("div");
  heading.classList.add("panel-heading");
  // heading.style="font-weight:bold";
  heading.innerText = "World configuration:";
  world_div.appendChild(heading);
  // world_color = "purple";
  body = document.createElement("div")
  body.classList.add("panel-body");
  world_div.appendChild(body);
  inputs["world"] = {};
  Object.keys(config.world).forEach(key => {
    current_input_label = document.createElement("label");
    current_input_label.innerText = key;
    // current_input_label.width = 100;
    // current_input_label.height = 50;
    // current_input_label.style = "font-family:arial;color:white;background-color:" + world_color;
    current_input = document.createElement("input");
    current_input.classList.add("form-control");
    current_input.id = input_id;
    current_input_label.htmlFor = input_id;
    current_input.value = str(config.world[key]);
    // current_input.style = "margin-right:1%;width:2%";
    // current_input.style = "margin-right:1%;width:2%";
    inputs["world"][key] = current_input;
    body.appendChild(current_input_label);
    body.appendChild(current_input);
  });
  document.getElementById('configurations').appendChild(world_div);
}

function create_buttons() {
  buttons_div = document.getElementById("buttons");
  
  apply_changes_button = document.createElement("button");
  apply_changes_button.innerHTML = '<span class="mdi mdi-check"></span> Apply config changes';
  apply_changes_button.classList.add("btn-success");
  apply_changes_button.addEventListener("click", apply_config_changes);
  buttons_div.appendChild(apply_changes_button)
  
  run_button = document.createElement("button");
  run_button.innerHTML = '<span class="mdi mdi-refresh"></span> Restart with current input';
  run_button.classList.add("btn-primary");
  run_button.addEventListener("click", restart_with_input_config);
  buttons_div.appendChild(run_button)
  
  reset_button = document.createElement("button");
  reset_button.innerHTML = '<span class="mdi mdi-cancel"></span> Reset to original';
  reset_button.classList.add("btn-danger");
  reset_button.addEventListener("click", reset);
  buttons_div.appendChild(reset_button)
  
  herd_button = document.createElement("button");
  herd_button.innerText = 'Herd (UK)';
  herd_button.classList.add("btn-info");
  herd_button.addEventListener("click", create_special_reset([HERD_SOCIETY]));
  buttons_div.appendChild(herd_button)
  
  social_distancing_button = document.createElement("button");
  social_distancing_button.innerText = 'Social_distancing (CHINA)';
  social_distancing_button.classList.add("btn-info");
  social_distancing_button.addEventListener("click", create_special_reset([SOCIAL_DISTANCING_SOCIETY]));
  buttons_div.appendChild(social_distancing_button);
  
  copy_shareable_link_button = document.createElement("button");
  copy_shareable_link_button.innerHTML = '<span class="mdi mdi-share"></span> Copy shareable link';
  copy_shareable_link_button.classList.add("btn","btn-success");
  copy_shareable_link_button.setAttribute("data-toggle","modal");
  copy_shareable_link_button.setAttribute("data-target","#modal_link_copied");
  copy_shareable_link_button.addEventListener("click", copy_shareable_link);
  buttons_div.appendChild(copy_shareable_link_button);
}

function copy_shareable_link() {
  s = serialize_config(config);
  u = "http://corona.dor.red/"; //window.location.href
  new_url = new URL(u);
  new_url.searchParams.set("config", s);
  copyToClipboard(new_url);
}

function serialize_config(c) {
  return encodeURIComponent(btoa(JSON.stringify(config)));
}

function copyToClipboard(str) {
  const el = document.createElement('textarea');  // Create a <textarea> element
  el.value = str;                                 // Set its value to the string that you want copied
  el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
  el.style.position = 'absolute';                 
  el.style.left = '-9999px';                      // Move outside the screen to make it invisible
  document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
  const selected =            
  document.getSelection().rangeCount > 0        // Check if there is any content selected previously
  ? document.getSelection().getRangeAt(0)     // Store selection if found
  : false;                                    // Mark as false to know no selection existed before
  el.select();                                    // Select the <textarea> content
  document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el);                  // Remove the <textarea> element
  if (selected) {                                 // If a selection existed before copying
    document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
    document.getSelection().addRange(selected);   // Restore the original selection
  }
}


function create_special_reset(society_configs) {
  function special_reset() {
    config = _deepClone(DEFAULT_CONFIG);
    for (var i = 0 ; i < Object.keys(society_configs).length ; i++) {
      for (var key in society_configs[0]) {
        config.societies[i][key] = society_configs[i][key];
      }
    }
    config.societies.splice(Object.keys(society_configs).length);
    run();
  }
  return special_reset;
}

function reset() {
  config = _deepClone(DEFAULT_CONFIG);
  run();
}

function apply_config_changes() {
  config = read_config_values(config, inputs);
}

function read_config_values(some_config, inputs_list) {
  some_config = _deepClone(some_config);
  for (const category in inputs_list) {
    if (category == "society") {
      for (const index in inputs_list[category]) {
        for (const key in inputs_list[category][index]) {
          some_config.societies[index][key] = float(document.getElementById(inputs_list[category][index][key].id).value);
        }
      }
    } else {
      for (const key in inputs_list[category]) {
        some_config[category][key] = float(inputs_list[category][key].value);
      }
    }
  }
  return some_config;
}