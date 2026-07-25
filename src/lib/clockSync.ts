/**
 * @license
 * High-Precision NTP Clock Synchronization Engine
 * Implements Cristian's Algorithm with EMA Smoothing & Outlier Filtering
 */

export interface NTPSample {
  t1: number; // Client send time (local)
  t2: number; // Server receive time (server)
  t3: number; // Server send time (server)
  t4: number; // Client receive time (local)
  rtt: number;
  offset: number;
}

export class NTPClockSync {
  private offsetHistory: number[] = [];
  private rttHistory: number[] = [];
  private currentOffset = 0;
  private currentRTT = 0;
  private alpha = 0.2; // Exponential Moving Average weighting factor
  private maxHistorySize = 10;
  private syncIntervalTimer: number | null = null;
  private sendPingCallback: ((t1: number) => void) | null = null;

  constructor(sendPingCallback: (t1: number) => void) {
    this.sendPingCallback = sendPingCallback;
  }

  public start(intervalMs = 4000) {
    this.stop();
    // Immediate initial probe sequence (3 rapid probes)
    this.probe();
    setTimeout(() => this.probe(), 500);
    setTimeout(() => this.probe(), 1000);

    // Periodic synchronization interval
    this.syncIntervalTimer = window.setInterval(() => {
      this.probe();
    }, intervalMs);
  }

  public stop() {
    if (this.syncIntervalTimer !== null) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }
  }

  public probe() {
    if (this.sendPingCallback) {
      const t1 = Date.now();
      this.sendPingCallback(t1);
    }
  }

  /**
   * Process server NTP response (t1, t2, t3)
   */
  public handlePong(t1: number, t2: number, t3: number) {
    const t4 = Date.now();
    const rtt = (t4 - t1) - (t3 - t2);
    const offset = ((t2 - t1) + (t3 - t4)) / 2;

    this.rttHistory.push(rtt);
    this.offsetHistory.push(offset);

    if (this.rttHistory.length > this.maxHistorySize) {
      this.rttHistory.shift();
      this.offsetHistory.shift();
    }

    // Filter outliers: Keep samples with lowest RTTs (upper quartile removal)
    const samples: NTPSample[] = this.rttHistory.map((r, i) => ({
      t1, t2, t3, t4,
      rtt: r,
      offset: this.offsetHistory[i]
    }));

    samples.sort((a, b) => a.rtt - b.rtt);

    // Keep lowest 60% RTT samples to avoid network spike noise
    const validCount = Math.max(1, Math.floor(samples.length * 0.6));
    const validSamples = samples.slice(0, validCount);

    const avgOffset = validSamples.reduce((acc, s) => acc + s.offset, 0) / validSamples.length;
    const avgRTT = validSamples.reduce((acc, s) => acc + s.rtt, 0) / validSamples.length;

    // Apply Exponential Moving Average (EMA)
    if (this.currentOffset === 0) {
      this.currentOffset = avgOffset;
      this.currentRTT = avgRTT;
    } else {
      this.currentOffset = this.alpha * avgOffset + (1 - this.alpha) * this.currentOffset;
      this.currentRTT = this.alpha * avgRTT + (1 - this.alpha) * this.currentRTT;
    }
  }

  /**
   * Get estimated current server epoch time in ms
   */
  public getCorrectedServerTime(): number {
    return Date.now() + this.currentOffset;
  }

  public getOffset(): number {
    return Math.round(this.currentOffset);
  }

  public getRTT(): number {
    return Math.round(this.currentRTT);
  }
}
