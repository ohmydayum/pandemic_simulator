class Society{
    constructor(V_MAX, MAX_FORCE, DAYS_UNTIL_QUARANTINED, HYGIENE, COUNT, PERCENTAGE_INITIAL_SICKNESS, INITIAL_ZONE, PERCENTAGE_QUARANTINED, AGE_DISTRIBUTION, percentage_verified, is_tracing_on) {
        this.V_MAX= V_MAX;
        this.MAX_FORCE= MAX_FORCE;
        this.DAYS_UNTIL_QUARANTINED= DAYS_UNTIL_QUARANTINED;
        this.PERCENTAGE_QUARANTINED= PERCENTAGE_QUARANTINED;
        this.HYGIENE= HYGIENE;
        this.COUNT= COUNT;
        this.PERCENTAGE_INITIAL_SICKNESS= PERCENTAGE_INITIAL_SICKNESS;
        this.INITIAL_ZONE= INITIAL_ZONE;
        this.AGE_DISTRIBUTION= AGE_DISTRIBUTION;
        this.percentage_verified= percentage_verified;
        this.is_tracing_on = is_tracing_on;
    }
}