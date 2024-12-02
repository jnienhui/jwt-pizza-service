const config = require('./config.js');
const os = require('os');

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.requestsByMethod = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
    this.activeUsersCount = 0;
    this.authSuccess = 0;
    this.authFailure = 0;
    this.pizzaMetrics = { sold: 0, creationFailures: 0, revenue: 0};
    this.pizzaLatency = [];
    this.serviceLatency = [];
  }

  // Middleware to track HTTP request metrics
  // requestTracker = (req, res, next) => {
  //   const method = req.method;
  //   console.log(method);
  //   this.incrementRequests(method);
  //   next();
  // };
  requestTracker(req, res, next) {
    const method = req.method;
    console.log(method);
    this.incrementRequests(method);
    next();
  }
  
  // Middleware to track request latency
  addLatency(latency) {
    this.serviceLatency.push(latency);
  }

  addPizzaLatency(latency){
    this.pizzaLatency.push(latency);
  }

  incrementRequests(method) {
    this.totalRequests++;
    if (this.requestsByMethod[method] !== undefined) {
      this.requestsByMethod[method]++;
    }
  }

  recordPizzaSale(revenue, numberOfItems, success) {
    if (success) {
      this.pizzaMetrics.sold =+ numberOfItems;
      this.pizzaMetrics.revenue += revenue;
    } else {
      this.pizzaMetrics.creationFailures++;
    }
  }

  // Get system metrics
  getSystemMetrics() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      cpuUsage: cpuUsage.toFixed(2),
      memoryUsage: memoryUsage.toFixed(2),
    };
  }

  // Send metrics periodically
  sendMetricsPeriodically(period) {
    setInterval(() => {
      try {
        this.sendHttpMetrics();
        this.sendAuthMetrics();
        this.sendUserMetrics();
        this.sendSystemMetrics();
        this.sendPizzaMetrics();
        this.sendServiceLatencyMetrics();
      } catch (error) {
        console.error('Error sending metrics:', error);
      }
    }, period).unref();
  }

  sendHttpMetrics() {
    this.sendMetricToGrafana('http_requests', 'all', 'total', this.totalRequests);
    for (const [method, count] of Object.entries(this.requestsByMethod)) {
      this.sendMetricToGrafana('http_requests', method, 'total', count);
    }
  }

  sendAuthMetrics() {
    this.sendMetricToGrafana('auth', 'all', 'success', this.authSuccess);
    this.sendMetricToGrafana('auth', 'all', 'failure', this.authFailure);
  }

  sendUserMetrics() {
    this.sendMetricToGrafana('user', 'all', 'active', this.activeUsersCount);
  }

  sendSystemMetrics() {
    const { cpuUsage, memoryUsage } = this.getSystemMetrics();
    this.sendMetricToGrafana('system', 'cpu', 'usage', cpuUsage);
    this.sendMetricToGrafana('system', 'memory', 'usage', memoryUsage);
  }

  sendPizzaMetrics() {
    this.sendMetricToGrafana('pizzas', 'all', 'sold', this.pizzaMetrics.sold);
    this.sendMetricToGrafana('pizzas', 'all', 'revenue', this.pizzaMetrics.revenue.toFixed(2));
    this.sendMetricToGrafana('pizzas', 'all', 'failures', this.pizzaMetrics.creationFailures);

    // Calculate average latency
    const latencies = this.pizzaLatency;
    if (latencies.length > 0) {
      const averageLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
      this.sendMetricToGrafana('pizzas', 'all', 'average_latency', averageLatency);
    }

    // Reset latencies to avoid duplication in the next report
    this.pizzaLatency = [];
  }

  sendServiceLatencyMetrics() {
    // Calculate average latency
    const latencies = this.serviceLatency;
    if (latencies.length > 0) {
        const averageLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
        this.sendMetricToGrafana('latencies', 'all', 'average_latency', averageLatency);
    }

    // Reset latencies to avoid duplication in the next report
    this.serviceLatency = [];
  }

  sendMetricToGrafana(metricPrefix, method, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},method=${method} ${metricName}=${metricValue}`;
    fetch(`${config.metrics.url}`, {
      method: 'POST',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          // console.log(`Pushed metric: ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

const metrics = new Metrics();
module.exports = metrics;
