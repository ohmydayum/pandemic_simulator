class Organism {
    constructor(age, x, y, vx, vy, initial_state, society) {
        this.age = age;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.state = initial_state;
        this.days_sick = 0;
        this.days_immune = 0;
        this.society = society;
    }

    is_immune() {
        return this.state == "immune";
    }
    
    move(dt, fx, fy, perimeters) {
        if (this.state == "quarantine" || this.state == "dead") {
            return;
        }
        
        this.vx = Math.min(Math.max(-this.society.V_MAX, this.vx + dt * fx), this.society.V_MAX);
        this.vy = Math.min(Math.max(-this.society.V_MAX, this.vy + dt * fy), this.society.V_MAX);
        
        
        let x_old = this.x
        this.x += dt * this.vx;
        let y_old = this.y;
        this.y += dt * this.vy;
        
        for (const key in Object.keys(perimeters)) {
            const p = perimeters[key];
            if (!p.is_allowed(this)) {
                let passed_x_border = ((x_old <= p.x_left && p.x_left <= this.x) || (x_old <= p.x_right && p.x_right <= this.x) || (x_old >= p.x_left && p.x_left >= this.x) || (x_old >= p.x_right && p.x_right >= this.x));
                let passed_y_border = ((y_old <= p.y_top && p.y_top <= this.y) || (y_old <= p.y_bottom && p.y_bottom <= this.y) || (y_old >= p.y_top && p.y_top >= this.y) || (y_old >= p.y_bottom && p.y_bottom >= this.y));
                if (passed_x_border && (p.y_top <= this.y && this.y <= p.y_bottom)) {
                    this.vx *= -1;
                    this.x = x_old;
                }
                
                if (passed_y_border && (p.x_left <= this.x && this.x <= p.x_right)) {
                    this.vy *= -1;
                    this.y = y_old;
                }

                if (passed_x_border && passed_y_border) {
                    this.vy *= -1;
                    this.y = y_old;
                    this.vx *= -1;
                    this.x = x_old;
                }
            }
        }
    }
    
    get_angle() {
        return Math.atan2(this.vy, this.vx);
    }    
    
    get_angle_to(other) {
        return Math.atan2(other.y-this.y, other.x-this.x);
    }

    is_infecting() {
        return this.state == 'sick' || this.state == 'carrier';
    }
    
    get_touched_by(other, pandemic, dt) {
        if (!other.is_infecting()) {return;}
        
        if (this.state == "healthy") {
            if (getRandom()/dt < pandemic.PERCENTAGE_INFECTION) {
                this.become_incubating();
                this.tracing_time = pandemic.DAYS_UNTIL_QUARANTINED - other.days_sick;
            }
        }
    }

    become_incubating() {
        this.days_incubating = 0;
        this.state = "incubating";
    }
    
    update_health(pandemic, is_healthcare_collapsed, dt) {
        if (this.tracing_time > 0) {
            tracing_time -= dt;
        }

        switch(this.state) {
            case "dead":
                break;
            case "healthy":
                break;
            case "immune":
                if (this.days_immune > pandemic.DAYS_IMMUNE_PASS) {
                    this.become_healthy()
                } else {
                    this.days_immune += dt;
                }
                break;
            case "incubating":
                if (this.days_incubating > pandemic.DAYS_INCUBATION) {
                    if (getRandom() < pandemic.PERCENTEAGE_BECOMING_CARRIER) {
                        this.become_carrier();
                    } else {
                        this.become_sick();
                    }
                } else {
                    this.days_incubating += dt;
                }
                break;
            case "carrier":
                if (this.days_sick >= pandemic.DAYS_OF_SICKNESS) {
                    if (getRandom() < pandemic.PERCENTAGE_BECOMING_IMMUNE) {
                        this.become_immune();
                    } else {
                        this.become_healthy();
                    }
                } else {
                    this.days_sick += dt;
                }
                break;
            case "sick":
                if (this.society.DAYS_UNTIL_QUARANTINED <= this.days_sick && getRandom()/dt < this.society.PERCENTAGE_QUARANTINED) {
                    this.become_quarantine();
                } else if (this.days_sick >= pandemic.DAYS_OF_SICKNESS) {
                    let p = pandemic.A * Math.exp(pandemic.B * this.age) + pandemic.C;
                    if (!is_healthcare_collapsed) {
                        p = 0//pandemic.A * Math.exp(pandemic.B * 90) + pandemic.C
                    }
                    
                    if (getRandom(100) < p) {
                        this.become_dead();
                    } else if (getRandom() < pandemic.PERCENTAGE_BECOMING_IMMUNE) {
                        this.become_immune();
                    } else {
                        this.become_healthy();
                    }
                } else {
                    this.days_sick += dt;    
                }
                break;
            case "quarantine":
                if (this.days_sick >= pandemic.DAYS_OF_SICKNESS) {
                    let p = pandemic.A * Math.exp(pandemic.B * this.age) + pandemic.C;
                    if (!is_healthcare_collapsed) {
                        p = 0//pandemic.A * Math.exp(pandemic.B * 90) + pandemic.C
                    }
                    
                    if (getRandom(100) < p) {
                        this.become_dead();
                    } else if (getRandom() < pandemic.PERCENTAGE_BECOMING_IMMUNE) {
                        this.become_immune();
                    } else {
                        this.become_healthy();
                    }
                } else {
                    this.days_sick += dt;    
                }
                break;
            default:
                console.error("unknown organism state", this);
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
    }
    
    is_dead() {
        return this.state == "dead";
    }
    
    static distance(o1, o2) {
        return ((o1.x - o2.x) ** 2 + (o1.y - o2.y) ** 2) ** 0.5;
    }
}