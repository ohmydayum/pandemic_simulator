const _VERSION = "4.5.2";
const _EMAIL = "dor.israeli+pandemic_simulator@gmail.com";

const BUCKET_SIZE = 5;
const AGES_BUCKETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
// const TLV_bs_p =  [3/2, 3/2, 4/2, 4/2, 1.7/2, 1.7/2, 2.5/2, 2.5/2, 4.3/2, 4.3/2, 4.6/2, 4.6/2, 5.5/2, 5.5/2, 2.5/2, 2.5/2];
const TLV_bs_p =  [34.484, 27.251, 21.794, 19.308, 22.544, 40.308, 51.815, 43.866, 33.044, 27.171, 21.017, 19.899, 20.175, 35, 35];
const BB_bs_p =  [16.8, 13.1, 11, 10.3, 16.5/2, 16.5/2, 14.5/3, 14.5/3, 14.5/3, 8.2/3, 8.2/3, 8.2/3, 2.7, 2.5, 4.4];
const INITIAL_SCREEN_WIDTH = 1000//$(window).width()*2/4;
const INITIAL_SCREEN_HEIGHT = 1000//$(window).width()*2/4;
const DEFAULT_SIMULATION_CONFIG = new Simulation(SHOW=true, EPOCH= 0.5, CANVAS_WIDTH=INITIAL_SCREEN_WIDTH, CANVAS_HEIGHT=INITIAL_SCREEN_HEIGHT, SKIPS= 1, PAUSED=false)
const PERIMITERS = [
  new Perimeter(new Rectangle(0, 50, 0, 50), youngest_allowed_age= 0, oldest_allowed_age= 999, is_outwards= false, error_probability=0.01 , allowed_states=["immune"]),
  new Perimeter(new Rectangle(0, 40, 0, 40), youngest_allowed_age= 0, oldest_allowed_age= 999, is_outwards= true, error_probability=0.01 , allowed_states=[]),
]
const DEFAULT_WORLD_CONFIG = new World(HEALTHCARE_CAPACITY= 0.002, PERIMETERS=PERIMITERS);
const TLV_SOCIETY_CONFIG = new Society(V_MAX= 10, MAX_FORCE= 10, DAYS_UNTIL_QUARANTINED= 2, HYGIENE= 5, COUNT= 8500, PERCENTAGE_INITIAL_SICKNESS= 0.001, INITIAL_ZONE= undefined, PERCENTAGE_QUARANTINED=0, AGE_DISTRIBUTION = TLV_bs_p, percentage_verified=0.15, is_tracing_on = true, percentage_traced=0.8);
const BB_SOCIETY_CONFIG = new Society(V_MAX= 100, MAX_FORCE= 100, DAYS_UNTIL_QUARANTINED= 2, HYGIENE= 5, COUNT= 20000, PERCENTAGE_INITIAL_SICKNESS= 0.001,  INITIAL_ZONE= new Rectangle(50, 1000, 50, 1000), PERCENTAGE_QUARANTINED=0, AGE_DISTRIBUTION = BB_bs_p, percentage_verified=0.10, is_tracing_on = false, percentage_traced=0.6);
const DEFAULT_PANDEMIC_CONFIG = new Pandemic(A= 0.05402627, B=0.07023024, C=0.08371868, DAYS_OF_SICKNESS= 30, PERCENTEAGE_BECOMING_CARRIER= 0.5, PERCENTAGE_BECOMING_IMMUNE= 0.8, DAYS_IMMUNE_PASS= 365, PERCENTAGE_INFECTION=0.5, DAYS_INCUBATION=1)
const DEFAULT_CONFIG = new Configuration(_VERSION, {"Tel Aviv": TLV_SOCIETY_CONFIG, }, DEFAULT_WORLD_CONFIG, DEFAULT_PANDEMIC_CONFIG, DEFAULT_SIMULATION_CONFIG);

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
  "incubating": "orange",
  'verified_sick_macro': 'pink',
  'quarantine': 'black',
  'verified_new_sick_macro': 'magenta',
  'verified_active_sick_macro': 'gold',
};

var population = [];
var ind;
var config = {};
var inputs = [];
var counters;

function setup() {
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
  create_configuration_controls();
  create_header();
  let canvas = createCanvas(1, 1);
  canvas.parent('simulation-holder');
  create_buttons();

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
    dps[key] = {};
  }
  some_counters['verified_sick_macro'] = old_counters['verified_sick_macro'];
  dps['quarantine'] = {};
  delete dps['verified_sick_macro'];

  // maybe just naive iteration
  // tree = new kdTree(population, Organism.distance, ["x", "y"]);
  // console.log(tree.balanceFactor());
  for (i = 0; i < population.length ; i++) {
    current_organism = population[i];
    let is_now_infected = false;
    let a_b = current_organism.age-(current_organism.age%BUCKET_SIZE);
    if (dps[current_organism.state][a_b] == undefined) {dps[current_organism.state][a_b]=0};
    dps[current_organism.state][a_b]++;
    if (dps['quarantine'][a_b] == undefined) {dps['quarantine'][a_b]=0};
    if (current_organism.is_quarantine()) {dps['quarantine'][a_b]++;};
    if (current_organism.state=="sick" || current_organism.state=="carrier") {
      infection_neighbours = tree.nearest(current_organism, 20, current_organism.society.HYGIENE);
      for (j = 0; j < infection_neighbours.length; j++) {
        other_organism = infection_neighbours[j][0];
        if (!(other_organism.state=="healthy")) {continue};
        is_now_infected = other_organism.get_touched_by(current_organism, config.pandemic, config.simulation.EPOCH);
      }
    }
    
    is_healthcare_collapsed = (old_counters['sick'])/population.length > config.world.HEALTHCARE_CAPACITY;
    let old_status = current_organism.state;
    current_organism.update_health(config.pandemic, is_healthcare_collapsed, config.simulation.EPOCH);
    some_counters[current_organism.state] += 1;
    
    let a = getRandom(2*Math.PI);
    let f = getRandom(current_organism.society.MAX_FORCE)
    let fx = f * Math.cos(a);
    let fy = f * Math.sin(a);
    let WORLD_BORDER = new Perimeter(new Rectangle(0, INITIAL_SCREEN_WIDTH, 0, INITIAL_SCREEN_HEIGHT), youngest_allowed_age= 999, oldest_allowed_age= 999, is_outwards= true, error_probability=0 , allowed_states=[]);
    current_organism.move(config.simulation.EPOCH, fx, fy, {...config.world.PERIMETERS, ...{WORLD_BORDER}}, current_organism.society.V_MAX);
    
    tree.remove(current_organism);
    if (current_organism.is_healthy()) {
      tree.insert(current_organism);
    }

    if (current_organism.state == "sick" || current_organism.state == "carrier") {
      some_counters['verified_active_sick_macro'] += current_organism.society.percentage_verified;
      if (old_status == "incubating") {
        some_counters['verified_sick_macro'] += current_organism.society.percentage_verified;
        some_counters['verified_new_sick_macro'] += current_organism.society.percentage_verified;
      }
    }
    if (current_organism.is_quarantine()) {
      some_counters['quarantine']++;
    }
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
  toggle_play();
  $("#modal_pandemic_over").modal('show');
}

function draw() {
  if (!config.simulation.PAUSED) {
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
  
  if (!config.simulation.SHOW) {
    hide_canvas();
  } else if (ind%config.simulation.SKIPS==0) {
    show_canvas();
    if (config.simulation.PAUSED) {
      draw_paused_world();
    } else {
      draw_world();
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
  delete line_some_counters['verified_active_sick_macro'];
  delete line_some_counters['verified_new_sick_macro'];
  delete line_some_counters['verified_sick_macro'];
  update_chart(line_chart, line_some_counters, line_series, t);

  let newspaper_some_counters = {};
  ['verified_sick_macro', 'dead', 'quarantine', 'verified_new_sick_macro' || group == 'verified_active_sick_macro', 'verified_active_sick_macro', 'verified_active_sick_macro'].forEach(key => {
    newspaper_some_counters[key] = some_counters[key];
  });
  update_chart(newspaper_chart, newspaper_some_counters, newspaper_series, t);

  some_counters_percents = {};
  for (let i = 0; i < Object.keys(some_counters).length; i++) {
    some_counters_percents[Object.keys(some_counters)[i]] = (Object.values(some_counters)[i]/Object.keys(population).length*100).toFixed(2);
  }
  update_chart(stacked_chart, some_counters_percents, stacked_series, t);
  
  try {
    for (let group = 0; group < Object.keys(dps).length; group++) {
      let group_ages = Object.values(dps)[group];
      for (let bucket_index = 0; bucket_index < Object.keys(group_ages).length; bucket_index++) {
        var bucket = int(Object.keys(group_ages)[bucket_index]);
        var population_in_bucket = group_ages[bucket_index*BUCKET_SIZE];
        if (population_in_bucket == undefined) {population_in_bucket = 0};
        ages_chart.data[group].dataPoints[bucket/BUCKET_SIZE].y = population_in_bucket; 
      }
    }
  } catch (error) {
    console.log(error)
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
    rect(p.zone.x_left, p.zone.y_top, p.zone.x_right-p.zone.x_left, p.zone.y_bottom-p.zone.y_top)
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
    rect(p.zone.x_left, p.zone.y_top, p.zone.x_right-p.zone.x_left, p.zone.y_bottom-p.zone.y_top)
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

function format_round(n, d) {
  return n.toFixed(d);
}


function update_chart(chart, current_some_counters, series, t) {
  for (var i = 0; i < Object.keys(current_some_counters).length; i++) {
    let value = float(Object.values(current_some_counters)[i]).toFixed(2);
    series[i].legendText = Object.keys(current_some_counters)[i] + " " + value;
    series[i].dataPoints.push({
      x: t,
      y: float(value),
    });
  }
  chart.render();
}

function draw_organism(o) {
  noStroke();
  if (o.is_dead()) {
    fill(100, 100, 100, 50);
  }else {
    fill(COLORS[current_organism.state]); 
  }

  if (o.is_quarantine()) {
    stroke(0);
    strokeWeight(3);
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

function scroll_to_top() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

var line_chart;
var stacked_chart;
var line_series;
var newspaper_series;
var stacked_series;
let ages_chart;
let dps_r;
function run() {
  ind = 0;
  resizeCanvas(config.simulation.CANVAS_WIDTH, config.simulation.CANVAS_HEIGHT);
  
  scroll_to_top();

  counters = {}
  Object.keys(COLORS).forEach(k=> {
    counters[k] = 0;
  });
  
  stacked_series = []
  stacked_chart = create_chart("stacked_chart", "stackedArea100", COLORS, stacked_series, "Stacked Population Segmentation");
  stacked_chart.render()
  
  let line_groups = _deepClone(COLORS);
  
  delete line_groups['verified_active_sick_macro'];
  delete line_groups['verified_new_sick_macro'];
  delete line_groups['verified_sick_macro'];
  line_series = [];
  line_chart = create_chart("line_chart", "line", line_groups, line_series, "Affected Groups Sizes");
  line_chart.render()
  population = create_population(config.societies);
  
  
  let newspaper_groups = {};
  ['verified_sick_macro', 'dead', 'quarantine', 'verified_new_sick_macro' || group == 'verified_active_sick_macro', 'verified_active_sick_macro'].forEach(key => {
    newspaper_groups[key] = COLORS[key];
  });
  newspaper_series = [];
  newspaper_chart = create_chart("newspaper_chart", "line", newspaper_groups, newspaper_series, "Newspaper Knowledge");
  newspaper_chart.render()

  for (i = 0; i < population.length ; i++) {
    current_organism = population[i]; 
    counters[current_organism.state] += 1;
  }

  tree = new kdTree(population, Organism.distance, ["x", "y"]);
  
  
  let ages_series = []
  for (let i = 0; i < Object.keys(COLORS).length; i++) {
    const group = Object.keys(COLORS)[i];
    if (group == "verified_sick_macro" || group == 'verified_new_sick_macro' || group == 'verified_active_sick_macro') continue;
    let dps_r = [];
    for (let j = 0; j < AGES_BUCKETS.length; j++) {
      dps_r.push({y: 0, label: AGES_BUCKETS[j]});
      
    }
    ages_series.push({			
      name: group,
      type: "column",
      color: COLORS[group],
      showInLegend: true, 
      dataPoints: dps_r,
    });
  }
  ages_chart = new CanvasJS.Chart("ages_chart", {
    exportEnabled: true,
    animationEnabled: true,
    zoomEnabled: true,
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
    data: ages_series,
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
      if (society.INITIAL_ZONE != undefined) {
        x = getRandom(society.INITIAL_ZONE.x_left, society.INITIAL_ZONE.x_right);
        y = getRandom(society.INITIAL_ZONE.y_top, society.INITIAL_ZONE.y_bottom);
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
        counters['verified_sick_macro'] += society.percentage_verified;
      }
      let current_organism = new Organism(age, x, y, vx, vy, initial_state, society);
      some_population.push(current_organism);
    }
  });
  return some_population;
}

var editor;

function create_configuration_controls() {  
  const container = document.getElementById("configurations");
  container.innerHTML = "";
  
  const options = {
    name: "Configuration",
    mode: "tree",
    enableSort: false,
    enableTransform: false,
    mainMenuBar: false,
    onChange: apply_config_changes,
  }
  editor = new JSONEditor(container, options, config)
}

function deep_set(obj1, obj2) {
  var props1 = Object.getOwnPropertyDescriptors(obj1);
  var props2 = Object.getOwnPropertyDescriptors(obj2);
  for (var prop in {...props1, ...props2}) {
    if (obj2[prop]==undefined) {
      delete obj1[prop];  
    } else if (obj1[prop]==undefined) {
      obj1[prop] = obj2[prop];
    } else if (typeof obj1[prop] !== "object") {
      obj1[prop] = obj2[prop]
    }else {
      deep_set(obj1[prop], obj2[prop])
    }
  }
}

function apply_config_changes() {
  deep_set(config, editor.get());
}

function apply_awareness() {
  config.societies['Tel Aviv'].HYGIENE = 3;
  config.societies['Tel Aviv'].PERCENTAGE_QUARANTINED = 0.8;
  config.societies['Tel Aviv'].V_MAX = 10; 
  config.societies['Tel Aviv'].is_tracing_on = true;
  editor.update(config);
}

function apply_lockdown() {
  config.societies['Tel Aviv'].HYGIENE = 2
  config.societies['Tel Aviv'].PERCENTAGE_QUARANTINED = 0.8;
  config.societies['Tel Aviv'].V_MAX = 0;
  config.societies['Tel Aviv'].is_tracing_on = true;
  editor.update(config);
}

function toggle_play() {
  if (config.simulation.PAUSED) {
    config.simulation.PAUSED = false;
    play_button.innerHTML = '<span class="mdi mdi-pause"></span> Pause';
    play_button.classList = ["btn-success"]
  } else {
    config.simulation.PAUSED = true;
    play_button.innerHTML = '<span class="mdi mdi-play-circle-outline"></span> Play';
    play_button.classList = ["btn-secondary"]
  }
  editor.update(config);
}

function toggle_visualization() {
  if (config.simulation.SHOW) {
    config.simulation.SHOW = false;
    visualizaion_button.classList = ["btn-secondary"]
    visualizaion_button.innerHTML = '<span class="mdi mdi-remove-red-eye"></span>Show Visualization';
  } else {
    config.simulation.SHOW = true;
    visualizaion_button.classList = ["btn-success"]
    visualizaion_button.innerHTML = '<span class="mdi mdi-remove-red-eye"></span>Hide Visualization';
  }
  editor.update(config);
}

function create_buttons() {
  buttons_div = document.getElementById("buttons");


  visualizaion_button = document.createElement("button");
  toggle_visualization();
  toggle_visualization();
  visualizaion_button.addEventListener("click", toggle_visualization);
  buttons_div.appendChild(visualizaion_button) 

  play_button = document.createElement("button");
  toggle_play();
  toggle_play();
  play_button.addEventListener("click", toggle_play);
  buttons_div.appendChild(play_button)
  
  restart_button = document.createElement("button");
  restart_button.innerHTML = '<span class="mdi mdi-refresh"></span> Restart';
  restart_button.classList.add("btn-primary");
  restart_button.addEventListener("click", run);
  buttons_div.appendChild(restart_button)
  
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

function reset() {
  config = _deepClone(DEFAULT_CONFIG);
  toggle_play();
  toggle_play();
  run();
}