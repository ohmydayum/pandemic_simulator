const _VERSION = "3.9.3";
const _EMAIL = "dor.israeli+pandemic_simulator@gmail.com";

const BUCKET_SIZE = 5;
const AGES_BUCKETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
const TLV_bs_p =  [3/2, 3/2, 4/2, 4/2, 1.7/2, 1.7/2, 2.5/2, 2.5/2, 4.3/2, 4.3/2, 4.6/2, 4.6/2, 5.5/2, 5.5/2, 2.5/2, 2.5/2];
const BB_bs_p =  [16.8, 13.1, 11, 10.3, 16.5/2, 16.5/2, 14.5/3, 14.5/3, 14.5/3, 8.2/3, 8.2/3, 8.2/3, 2.7, 2.5, 4.4];
const INITIAL_SCREEN_WIDTH = 1000//$(window).width()*2/4;
const INITIAL_SCREEN_HEIGHT = 1000//$(window).width()*2/4;
const DEFAULT_SIMULATION_CONFIG = new Simulation(SHOW=1, EPOCH= 0.5, CANVAS_WIDTH=INITIAL_SCREEN_WIDTH, CANVAS_HEIGHT=INITIAL_SCREEN_HEIGHT, SKIPS= 1, PAUSED=1)
const PERIMITERS = [new Perimeter(0, INITIAL_SCREEN_WIDTH, 0, INITIAL_SCREEN_HEIGHT, function(o) {return false})]//, new Perimeter(0, 300, 300, 600, function(o) {return o.vy<0 && getRandom()<0.1 && (o.is_immune() || getRandom()<0.5)}), new Perimeter(0, 300, 0, 290, function(o) {return o.vy<0})];
const DEFAULT_WORLD_CONFIG = new World(HEALTHCARE_CAPACITY= 0.002, PERIMETERS=PERIMITERS);
const TLV_SOCIETY_CONFIG = new Society(V_MAX= 100, MAX_FORCE= 100, DAYS_UNTIL_QUARANTINED= 2, HYGIENE= 5, COUNT= 8500, PERCENTAGE_INITIAL_SICKNESS= 0.01, PERIMITER= undefined, PERCENTAGE_QUARANTINED=0, AGE_DISTRIBUTION = TLV_bs_p);
// const BB_SOCIETY_CONFIG = new Society(V_MAX= 30, MAX_FORCE= 100, DAYS_UNTIL_QUARANTINED= 2, HYGIENE= 10, COUNT= 1000, PERCENTAGE_INITIAL_SICKNESS= 0.1, PERIMITER=PERIMITERS[1], PERCENTAGE_QUARANTINED=0, AGE_DISTRIBUTION = BB_bs_p);
const DEFAULT_PANDEMIC_CONFIG = new Pandemic(A= 0.05402627, B=0.07023024, C=0.08371868, DAYS_OF_SICKNESS= 14, PERCENTEAGE_BECOMING_CARRIER= 0.5, PERCENTAGE_BECOMING_IMMUNE= 0.8, DAYS_IMMUNE_PASS= 365, PERCENTAGE_INFECTION=0.5, DAYS_INCUBATION=1)
const DEFAULT_CONFIG = new Configuration(_VERSION, [TLV_SOCIETY_CONFIG, ], DEFAULT_WORLD_CONFIG, DEFAULT_PANDEMIC_CONFIG, DEFAULT_SIMULATION_CONFIG);

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
var tree;

function deserialize_config(s) {
  return JSON.parse(atob(decodeURIComponent(s)));
}
const COLORS = {
  "dead": "gray",
  "healthy": "green",
  "immune": "blue",
  "carrier": "brown",
  "sick": "red",
  "quarantine": "black",
  "incubating": "orange",
};

var population = [];
var ind;
var config = {};
var inputs = [];
var counters;

function setup() {
  create_header();
  let canvas = createCanvas(1, 1);
  canvas.parent('simulation-holder');
  create_buttons();
  var queryString = window.location.search;
  var urlParams = new URLSearchParams(queryString);
  config = _deepClone(DEFAULT_CONFIG);
  if (urlParams.has("config")) {
    s = urlParams.get("config");
    try{
      let loaded_config = deserialize_config(s);
      if (loaded_config.version == _VERSION) {
        config = loaded_config;
        $("#modal_configuration_loaded").modal('show');
      } else {
        $("#modal_configuration_version_mismatch_error").modal('show'); 
      }
    } catch {
      $("#modal_configuration_deserialization_error").modal('show');
    }
  }
  
  counters = {}
  Object.keys(COLORS).forEach(k=> {
    counters[k] = 0;
  });
  for (i = 0; i < population.length ; i++) {
    current_organism = population[i];
    counters[current_organism.state] += 1;
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

function update_simulation(population, old_counters) {
  let dps = {};
  
  let some_counters = {};
  for (key in COLORS) {
    some_counters[key] = 0;
  }

  // maybe just naive iteration
  for (i = 0; i < population.length ; i++) {
    current_organism = population[i];
    if (current_organism.is_dead()) {
      let a_b = current_organism.age-(current_organism.age%BUCKET_SIZE);
      if (dps[a_b] == undefined) {dps[a_b]=0};
      dps[a_b]++;
    } else if (current_organism.state=="sick" || current_organism.state=="carrier") {
      infection_neighbours = tree.nearest(current_organism, 20, current_organism.society.HYGIENE);
      for (j = 0; j < infection_neighbours.length; j++) {
        other_organism = infection_neighbours[j][0];
        if (!(other_organism.state=="healthy")) {continue};
        other_organism.get_touched_by(current_organism, config.pandemic, config.simulation.EPOCH);
      }
    }
    tree.remove(current_organism);

    is_healthcare_collapsed = (old_counters['sick']+old_counters['quarantine'])/population.length > config.world.HEALTHCARE_CAPACITY;
    current_organism.update_health(config.pandemic, is_healthcare_collapsed, config.simulation.EPOCH);
    let a = getRandom(2*Math.PI);
    let f = getRandom(current_organism.society.MAX_FORCE)
    let fx = f * Math.cos(a);
    let fy = f * Math.sin(a);
    current_organism.move(config.simulation.EPOCH, fx, fy, config.world.PERIMETERS);
    if (!current_organism.is_dead()) {
      tree.insert(current_organism);
    }
    some_counters[current_organism.state] += 1;
  }
  ind++;
  return [some_counters, dps];
}

function hide_canvas() {
  document.getElementById("simulation-holder").style = "display:none";
}

function show_canvas() {
  document.getElementById("simulation-holder").style = "display:block";
}

function inform_pandemic_over() {
  pause_simulation();
  $("#modal_pandemic_over").modal('show');
}

function draw() {
  if (config.simulation.PAUSED==0) {
    let cd = update_simulation(population, counters);
    counters = cd[0];
    let dps = cd[1];
    if (ind%config.simulation.SKIPS==0) {
      t = ind*config.simulation.EPOCH;
      update_charts(counters, t, dps);
    }
    if (counters['healthy']+counters['immune']+counters['dead'] == population.length) {
      inform_pandemic_over();
    }
  }
  
  if (config.simulation.SHOW==0) {
    hide_canvas();
  } else if (ind%config.simulation.SKIPS==0) {
    show_canvas();
    if (config.simulation.PAUSED==0) {
      draw_world();
    } else {
      draw_paused_world();
    }
    draw_population(config.population);
  }
}

function draw_population() {
  for (i = 0; i < population.length ; i++) {
    current_organism = population[i];
    draw_organism(current_organism);
  }
}

function update_charts(some_counters, t, dps) {
  let line_some_counters = _deepClone(some_counters);
  line_some_counters['Healthcare Capacity'] = population.length * config.world.HEALTHCARE_CAPACITY;
  update_chart(line_chart, line_some_counters, line_series, t);
  some_counters_percents = {};
  for (let i = 0; i < Object.keys(some_counters).length; i++) {
    some_counters_percents[Object.keys(some_counters)[i]] = (Object.values(some_counters)[i]/Object.keys(population).length*100).toFixed(2);
  }
  update_chart(stacked_chart, some_counters_percents, stacked_series, t);
  
  for (let i = 0; i < Object.keys(dps).length; i++) {
    const element = Object.values(dps)[i];
    ages_chart.data[0].dataPoints[Object.keys(dps)[i]/BUCKET_SIZE].y = Object.values(dps)[i]; 
  }
  ages_chart.render();
}

function draw_world() {
  fill(255);
  rect(0, 0, config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  for (const key in config.world.PERIMETERS) {
    p = config.world.PERIMETERS[key];
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(p.x_left, p.y_top, p.x_right-p.x_left, p.y_bottom-p.y_top)
  }
}
function draw_paused_world() {
  fill(180);
  rect(0, 0, config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  for (const key in config.world.PERIMETERS) {
    p = config.world.PERIMETERS[key];
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(p.x_left, p.y_top, p.x_right-p.x_left, p.y_bottom-p.y_top)
  }
}

function create_chart(id, type, groups, series, title) {
  for (let i = 0; i < Object.keys(groups).length; i++) {
    series.push({			
      type: type,
      showInLegend: true,
      name: Object.keys(groups)[i],
      dataPoints: [],
      color: Object.values(groups)[i],
      visible: !(type=="line"&&Object.keys(groups)[i]=="healthy"),
    });
  }
  
  var chart = new CanvasJS.Chart(id, {
    theme: "light2",
    exportEnabled: true,
    animationEnabled: true,
    zoomEnabled: true,
    title: {
      text: title
    },
    toolTip: {
      shared: true
    },
    legend: {
      cursor:"pointer",
      verticalAlign: "top",
      fontSize: 15,
      fontColor: "dimGrey",
      usePointStyle: true,
      itemclick : toggleDataSeries,
    },
    axisX: {
      title: "Time [days]",
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
}


function update_chart(chart, current_some_counters, series, t) {
  for (var i = 0; i < Object.keys(current_some_counters).length; i++) {
    series[i].legendText = Object.keys(current_some_counters)[i] + " " + Object.values(current_some_counters)[i];
    series[i].dataPoints.push({
      x: t,
      y: float(Object.values(current_some_counters)[i])
    });
  }
  chart.render();
}

function draw_organism(o) {
  noStroke();
  if (o.is_dead()) {
    fill(100, 100, 100, 50);
  } else {
    fill(COLORS[current_organism.state]); 
  }
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

function scroll_to_top() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

var line_chart;
var stacked_chart;
var line_series;
var stacked_series;
let ages_chart;
let dps_r;
function run() {
  ind = 0;
  create_configuration_controls();
  resizeCanvas(config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  
  scroll_to_top();

  line_series = [];
  stacked_series = []
  stacked_chart = create_chart("stacked_chart", "stackedArea100", COLORS, stacked_series, "Stacked Population Segmentation");

  let line_groups = _deepClone(COLORS);
  // delete line_groups.healthy;
  line_groups['Healthcare Capacity'] = 'pink';
  line_chart = create_chart("line_chart", "line", line_groups, line_series, "Affected Groups Sizes");
  line_chart.render()
  population = create_population(config.societies);
  tree = new kdTree(population, Organism.distance, ["x", "y"]);
  
  dps_r = [];
  bs = []
  for (let i = 0; i < AGES_BUCKETS.length; i++) {
    dps_r.push({y: 0, label: AGES_BUCKETS[i]});
    
  }
  ages_chart = new CanvasJS.Chart("ages_chart", {
    animationEnabled: true,
    exportEnabled: true,
    theme: "light2", // "light1", "light2", "dark1", "dark2"
    title:{
      text: "Ages Demographics"
    },
    axisY: {
      title: "Amount [units]"
    },
    axisX: {
      title: "Age [years]",
    },
    data: [{			
      name: "death cases",
      type: "column",
      color: COLORS['dead'],
      showInLegend: true, 
      dataPoints: dps_r,
    }],
  });
  ages_chart.render();
}

function getRandom(max, min) {
  if (min === undefined) {min=0};
  if (max === undefined) {max=1}; 
  return min + Math.random()*(max-min);
}


function create_population(societies) {
  let some_population = [];
  Object.values(societies).forEach(society => {  
    let eb = [];
    for (let i = 0; i< AGES_BUCKETS.length; i++) {
      c_bs_p = 100 * society.AGE_DISTRIBUTION[i];
      for (let j = 0; j < c_bs_p; j++) {
        eb.push(AGES_BUCKETS[i]);
      }
    }
    for (i = 0; i < society.COUNT; i++) {
      // age = 100*(1-getRandom()**0.5);
      let b = eb[int(getRandom(eb.length))];
      let age = getRandom(b, b+BUCKET_SIZE);
      let x,y;
      if (society.PERIMETER != undefined) {
        x = getRandom(society.PERIMETER.x_left, society.PERIMETER.x_right);
        y = getRandom(society.PERIMETER.y_top, society.PERIMETER.y_bottom);
      } else {
        x = getRandom(0, config.simulation.CANVAS_WIDTH);
        y = getRandom(0, config.simulation.CANVAS_HEIGHT);
      }
      let angle = getRandom(2*Math.PI);
      let vx = getRandom() * society.V_MAX * Math.cos(angle);
      let vy = getRandom() * society.V_MAX * Math.sin(angle);
      let initial_state = "healthy";
      if (i < society.COUNT * society.PERCENTAGE_INITIAL_SICKNESS) {
        initial_state = "sick";
      }
      let current_organism = new Organism(age, x, y, vx, vy, initial_state, society);
      some_population.push(current_organism);
    }
  });
  return some_population;
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
      if (key=="PERIMETER" || key=="AGE_DISTRIBUTION") {continue};
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
    if (key=="PERIMETERS") {
      
      return
    };
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

function apply_awareness() {
  config.societies[0].HYGIENE = 3;
  inputs.society[0].HYGIENE.value = 3;
  
  config.societies[0].PERCENTAGE_QUARANTINED = 0.8;
  inputs.society[0].PERCENTAGE_QUARANTINED.value = 0.8;
  
  config.societies[0].V_MAX = 10;
  inputs.society[0].V_MAX.value = 10;
}

function apply_lockdown() {
  config.societies[0].HYGIENE = 2
  inputs.society[0].HYGIENE.value = 2;
  
  config.societies[0].PERCENTAGE_QUARANTINED = 0.8;
  inputs.society[0].PERCENTAGE_QUARANTINED.value = 0.8;
  
  config.societies[0].V_MAX = 0;
  inputs.society[0].V_MAX.value = 0;
}

function play_simulation() {
  config.simulation.PAUSED = 0;
  inputs.simulation.PAUSED.value = 0;
}

function pause_simulation() {
  config.simulation.PAUSED = 1;
  inputs.simulation.PAUSED.value = 1;
}

function toggle_visualization() {
  config.simulation.SHOW = 1-config.simulation.SHOW;
  inputs.simulation.SHOW.value = 1-inputs.simulation.SHOW.value;
}

function create_buttons() {
  buttons_div = document.getElementById("buttons");
  
  
  visualizaion_button = document.createElement("button");
  visualizaion_button.innerHTML = '<span class="mdi mdi-remove-red-eye"></span> Visualization';
  visualizaion_button.classList.add("btn-success");
  visualizaion_button.addEventListener("click", toggle_visualization);
  buttons_div.appendChild(visualizaion_button) 
  
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
  
  pause_button = document.createElement("button");
  pause_button.innerHTML = '<span class="mdi mdi-pause"></span> Pause';
  pause_button.classList.add("btn-warning");
  pause_button.addEventListener("click", pause_simulation);
  buttons_div.appendChild(pause_button) 
  
  play_button = document.createElement("button");
  play_button.innerHTML = '<span class="mdi mdi-play-circle-outline"></span> Play';
  play_button.classList.add("btn-success");
  play_button.addEventListener("click", play_simulation);
  buttons_div.appendChild(play_button)
  
  reset_button = document.createElement("button");
  reset_button.innerHTML = '<span class="mdi mdi-cancel"></span> Reset to original';
  reset_button.classList.add("btn-danger");
  reset_button.addEventListener("click", reset);
  buttons_div.appendChild(reset_button)
  
  awerness_button = document.createElement("button");
  awerness_button.innerText = 'Awareness';
  awerness_button.classList.add("btn-info");
  awerness_button.addEventListener("click", apply_awareness);
  buttons_div.appendChild(awerness_button)
  
  lockdown_button = document.createElement("button");
  lockdown_button.innerText = 'Lockdown';
  lockdown_button.classList.add("btn-warning");
  lockdown_button.addEventListener("click", apply_lockdown);
  buttons_div.appendChild(lockdown_button)
  
  // herd_button = document.createElement("button");
  // herd_button.innerText = 'Herd (UK)';
  // herd_button.classList.add("btn-info");
  // herd_button.addEventListener("click", create_special_reset([HERD_SOCIETY]));
  // buttons_div.appendChild(herd_button)
  
  // social_distancing_button = document.createElement("button");
  // social_distancing_button.innerText = 'Social_distancing (CHINA)';
  // social_distancing_button.classList.add("btn-info");
  // social_distancing_button.addEventListener("click", create_special_reset([SOCIAL_DISTANCING_SOCIETY]));
  // buttons_div.appendChild(social_distancing_button);
  
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
  read_inputs_into_cofig(inputs, config);
  scroll_to_top();
}

function read_inputs_into_cofig(inputs_list, some_config) {
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
  let WORLD_PERIMETER = new Perimeter(0, some_config.simulation.CANVAS_WIDTH, 0, some_config.simulation.CANVAS_HEIGHT, function(o){return false});
  some_config.world.PERIMETERS = [WORLD_PERIMETER];
}