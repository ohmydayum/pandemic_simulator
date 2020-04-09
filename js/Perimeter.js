class Perimeter {
    constructor(zone, youngest_allowed_age, oldest_allowed_age, is_outwards, error_probability, allowed_states) {
        this.zone = zone;
        this.youngest_allowed_age = youngest_allowed_age;
        this.oldest_allowed_age = oldest_allowed_age;
        this.is_outwards = is_outwards;
        this.error_probability = error_probability;
        this.allowed_states = allowed_states;
    }
}