class Perimeter {
    constructor(x_left, x_right, y_top, y_bottom, youngest_allowed_age, oldest_allowed_age, is_outwards, error_probability, allowed_states) {
        this.x_left = x_left;
        this.x_right = x_right;
        this.y_top = y_top;
        this.y_bottom = y_bottom;
        
        this.youngest_allowed_age = youngest_allowed_age;
        this.oldest_allowed_age = oldest_allowed_age;
        this.is_outwards = is_outwards;
        this.error_probability = error_probability;
        this.allowed_states = allowed_states;
    }

    is_inside(x, y) {
        let is_x_inside = this.x_left <= x && x <= this.x_right; 
        let is_y_inside = this.y_top <= y && y <= this.y_bottom;
        
        return is_x_inside && is_y_inside;
    }
}