/**
 * Chaos Service - Manages simulated failures for testing 2PC robustness.
 * This is a development/test-only service.
 */
class ChaosService {
  constructor() {
    this.config = {
      enabled: false,
      failurePoint: 'NONE', // 'PREPARE', 'COMMIT'
      failureMode: 'REJECT' // 'REJECT', 'TIMEOUT'
    };
  }

  setChaos(enabled, failurePoint, failureMode) {
    this.config.enabled = enabled;
    this.config.failurePoint = failurePoint || 'NONE';
    this.config.failureMode = failureMode || 'REJECT';
    console.log(`[CHAOS] Updated config for ${process.env.BRANCH_ID || 'COORDINATOR'}:`, this.config);
  }

  getChaos() {
    return this.config;
  }

  shouldFail(point) {
    if (!this.config.enabled) return false;
    return this.config.failurePoint === point;
  }

  async applyFailure(point, actionDescription) {
    if (!this.shouldFail(point)) return;

    console.log(`[CHAOS] Injecting failure at ${point}: ${actionDescription}`);

    if (this.config.failureMode === 'TIMEOUT') {
      console.log(`[CHAOS] Simulating TIMEOUT (waiting 10s)...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      throw new Error('SIMULATED_TIMEOUT');
    }

    if (this.config.failureMode === 'REJECT') {
      console.log(`[CHAOS] Simulating REJECT...`);
      throw new Error('SIMULATED_REJECTION');
    }
  }
}

module.exports = new ChaosService();
