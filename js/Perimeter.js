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
}