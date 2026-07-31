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
  public solve(cov: number[][], mu: number[], lambda: number, targetSum: number, maxIters: number = 10000, tol: number = 1e-6): number[] {
    const n = cov.length;
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
    const lr = maxEigenVal > 0 ? 1 / maxEigenVal : 0.01;

    for (let iter = 0; iter < maxIters; iter++) {
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

      // 4. Check convergence
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        const diff = Math.abs(w_proj[i] - w[i]);
        if (diff > maxDiff) maxDiff = diff;
      }

      w = w_proj;

      if (maxDiff < tol) {
        break; // Converged
      }
    }

    return w;
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
