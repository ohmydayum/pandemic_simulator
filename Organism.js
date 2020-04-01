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
    
    can_see(other, radius, opening_angle) {
        return Math.abs(this.get_angle_to(other) - this.get_angle()) < opening_angle && (this.x-other.x)**2+(this.y-other.y)**2 < radius**2;
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
    
    update_health(is_healthcare_collapsed, dt) {
        if (this.state == "dead") {
            return;
        }
        
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
        
        let p = CONFIG.PANDEMIC.DEATH_PERCENTAGE * (this.age / 100) ** 2;
        if (is_healthcare_collapsed) {
            p = CONFIG.PANDEMIC.DEATH_PERCENTAGE
        }
        
        if (random() < p) {
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
    }
    
    is_dead() {
        return this.state == "dead";
    }
    
    static distance(o1, o2) {
        return ((o1.x - o2.x) ** 2 + (o1.y - o2.y) ** 2) ** 0.5;
    }
}