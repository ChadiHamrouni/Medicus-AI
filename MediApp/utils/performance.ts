/**
 * Performance measurement utilities for React Query instrumentation
 *
 * Usage:
 * - measureFetch: Measure API call duration
 * - measureRender: Measure component render time
 * - logPerformanceMetrics: View all recorded metrics
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'fetch' | 'render' | 'cache-hit';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean = __DEV__; // Only in development

  /**
   * Measure fetch request duration
   */
  measureFetch(
    endpoint: string,
    startTime: number,
    metadata?: Record<string, any>
  ) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.push({
      name: endpoint,
      duration,
      timestamp: Date.now(),
      type: 'fetch',
      metadata,
    });

    console.log(
      `[PERF] 🌐 Fetch: ${endpoint} | ${duration.toFixed(2)}ms`,
      metadata
    );
  }

  /**
   * Measure render duration
   */
  measureRender(
    component: string,
    startTime: number,
    fromCache: boolean = false
  ) {
    if (!this.enabled) return;

    const duration = performance.now() - startTime;
    this.metrics.push({
      name: component,
      duration,
      timestamp: Date.now(),
      type: fromCache ? 'cache-hit' : 'render',
      metadata: { fromCache },
    });

    const icon = fromCache ? '⚡' : '🎨';
    const source = fromCache ? 'CACHE' : 'NETWORK';
    console.log(
      `[PERF] ${icon} Render: ${component} (${source}) | ${duration.toFixed(2)}ms`
    );
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get average duration for a specific metric name
   */
  getAverageDuration(name: string): number {
    const relevant = this.metrics.filter(m => m.name === name);
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    console.log('[PERF] 🧹 Metrics cleared');
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No metrics recorded';
    }

    const fetchMetrics = this.getMetricsByType('fetch');
    const cacheMetrics = this.getMetricsByType('cache-hit');
    const renderMetrics = this.getMetricsByType('render');

    const report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         REACT QUERY PERFORMANCE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY
  Total Metrics: ${this.metrics.length}
  Network Fetches: ${fetchMetrics.length}
  Cache Hits: ${cacheMetrics.length}
  Renders: ${renderMetrics.length}

🌐 NETWORK FETCHES (avg duration)
${this.generateMetricsList(fetchMetrics)}

⚡ CACHE HITS (avg duration)
${this.generateMetricsList(cacheMetrics)}

🎨 RENDERS (avg duration)
${this.generateMetricsList(renderMetrics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }

  private generateMetricsList(metrics: PerformanceMetric[]): string {
    if (metrics.length === 0) return '  (none)';

    const grouped = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = [];
        }
        acc[metric.name].push(metric.duration);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(grouped)
      .map(([name, durations]) => {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        return `  ${name}: ${avg.toFixed(2)}ms avg (min: ${min.toFixed(2)}ms, max: ${max.toFixed(2)}ms, count: ${durations.length})`;
      })
      .join('\n');
  }

  /**
   * Log performance report to console
   */
  logReport() {
    console.log(this.generateReport());
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Global access for debugging in console
if (__DEV__) {
  (global as any).perfMonitor = performanceMonitor;
}
