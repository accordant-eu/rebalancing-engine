import { logger } from '../utils/logger';

export class ProjectedGradientDescent {
  /**
   * Solves the portfolio optimization problem:
   * Minimize: 1/2 * w^T * Cov * w - lambda * w^T * mu
   * Subject to: sum(w) = targetSum, w >= 0
   *
   * @param cov Covariance matrix (NxN)
   * @param mu Expected returns vector (N)
   * @param lambda Risk aversion parameter (0 for Minimum Variance, >0 for Efficient Frontier)
   * @param targetSum The sum of the weights (usually 1.0 - cashBuffer)
   * @param maxIters Maximum number of iterations
   * @param tol Convergence tolerance
   */
  public async solve(cov: number[][], mu: number[], lambda: number, targetSum: number, maxIters: number = 10000, tol: number = 1e-6): Promise<{ converged: boolean, iters: number, weights: number[] }> {
    const n = cov.length;
    if (n === 0 || mu.length !== n) {
      throw new Error(`ProjectedGradientDescent: Dimension mismatch. Covariance matrix is ${n}x${cov[0]?.length || 0}, expected returns length is ${mu.length}.`);
    }
    if (targetSum <= 0 || isNaN(targetSum) || !isFinite(targetSum)) {
      throw new Error(`ProjectedGradientDescent: Invalid targetSum ${targetSum}. Must be > 0 and finite.`);
    }
    if (lambda < 0 || isNaN(lambda) || !isFinite(lambda)) {
      throw new Error(`ProjectedGradientDescent: Invalid lambda ${lambda}. Must be >= 0 and finite.`);
    }

    for (let i = 0; i < n; i++) {
      if (isNaN(mu[i]) || !isFinite(mu[i])) {
        throw new Error(`ProjectedGradientDescent: Invalid expected return at index ${i}: ${mu[i]}`);
      }
      if (!cov[i] || cov[i].length !== n) {
        throw new Error(`ProjectedGradientDescent: Covariance matrix is not square at row ${i}.`);
      }
      for (let j = 0; j < n; j++) {
        if (isNaN(cov[i][j]) || !isFinite(cov[i][j])) {
          throw new Error(`ProjectedGradientDescent: Invalid covariance value at [${i}][${j}]: ${cov[i][j]}`);
        }
      }
    }

    let w = Array(n).fill(targetSum / n); // Initialize with equal weights
    
    // Determine a safe learning rate (1 / Lipschitz constant of gradient)
    // A rough upper bound for the maximum eigenvalue is the maximum absolute row sum
    let maxEigenVal = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) {
        rowSum += Math.abs(cov[i][j]);
      }
      if (rowSum > maxEigenVal) maxEigenVal = rowSum;
    }
    if (maxEigenVal <= 0 || isNaN(maxEigenVal)) {
      logger.warn('ProjectedGradientDescent: Covariance matrix max eigenvalue is 0 or NaN. Inputs may be degenerate.');
      return { converged: false, iters: 0, weights: w };
    }
    const lr = 1 / maxEigenVal;

    let lastYield = Date.now();
    for (let iter = 0; iter < maxIters; iter++) {
      // Yield to the event loop if we've been running synchronously for more than 10ms
      // This prevents O(N^2) loops from blocking the main thread for seconds.
      const now = Date.now();
      if (now - lastYield > 10) {
        await new Promise(resolve => setImmediate(resolve));
        lastYield = Date.now();
      }

      // 1. Calculate gradient: g = Cov * w - lambda * mu
      const g = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let cov_w = 0;
        for (let j = 0; j < n; j++) {
          cov_w += cov[i][j] * w[j];
        }
        g[i] = cov_w - lambda * mu[i];
      }

      // 2. Gradient descent step
      const w_next = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        w_next[i] = w[i] - lr * g[i];
      }

      // 3. Project onto the probability simplex (sum(w) = targetSum, w >= 0)
      const w_proj = this.projectToSimplex(w_next, targetSum);

      // 4. Numerical instability safeguard
      let unstable = false;
      for (let i = 0; i < n; i++) {
        if (isNaN(w_proj[i]) || !isFinite(w_proj[i])) {
          unstable = true;
          break;
        }
      }
      
      if (unstable) {
        logger.warn({ maxIters, targetSum }, 'ProjectedGradientDescent encountered NaN/Infinity. Aborting iteration.');
        return { converged: false, iters: iter + 1, weights: w };
      }

      // 5. Check convergence
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        const diff = Math.abs(w_proj[i] - w[i]);
        if (diff > maxDiff) maxDiff = diff;
      }

      w = w_proj;

      if (maxDiff < tol) {
        return { converged: true, iters: iter + 1, weights: w };
      }
    }

    logger.warn({ maxIters, targetSum }, 'ProjectedGradientDescent failed to converge within maximum iterations');
    return { converged: false, iters: maxIters, weights: w };
  }

  /**
   * Projects a vector onto the simplex: sum(v) = targetSum, v >= 0
   * Using the O(N log N) sorting algorithm.
   */
  private projectToSimplex(v: number[], targetSum: number): number[] {
    const n = v.length;
    if (n === 0) return [];
    
    const u = [...v].sort((a, b) => b - a);
    let rho = 0;
    let sumU = 0;
    
    for (let i = 0; i < n; i++) {
      sumU += u[i];
      const tMax = (sumU - targetSum) / (i + 1);
      if (u[i] > tMax) {
        rho = i;
      }
    }
    
    let sumForRho = 0;
    for (let i = 0; i <= rho; i++) {
      sumForRho += u[i];
    }
    const theta = (sumForRho - targetSum) / (rho + 1);
    
    const w = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      w[i] = Math.max(v[i] - theta, 0);
    }
    
    return w;
  }
}
