import crypto from 'crypto';

export class SyntheticRiskModel {
  /**
   * Generates a stable pseudo-random expected return based on the instrument ID.
   * Note: This is for deterministic mock generation only. Not intended for secure cryptographic use.
   * Returns a value between -0.05 and 0.15 (annualized).
   */
  public getExpectedReturns(instrumentIds: string[]): number[] {
    return instrumentIds.map(id => {
      const hash = crypto.createHash('sha256').update(id).digest('hex');
      const val = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
      return -0.05 + val * 0.20; 
    });
  }

  /**
   * Generates a stable, positive-definite covariance matrix for a given set of instruments.
   * We construct a base volatility and then a random correlation matrix.
   * Then Cov = diag(vol) * Corr * diag(vol).
   * To ensure it is positive definite, we mix in the identity matrix.
   */
  public getCovarianceMatrix(instrumentIds: string[]): number[][] {
    const n = instrumentIds.length;
    
    // 1. Generate volatilities between 10% and 40%
    const vols = instrumentIds.map(id => {
      const hash = crypto.createHash('sha256').update(id + '_vol').digest('hex');
      const val = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
      return 0.10 + val * 0.30;
    });

    // 2. Generate a random matrix A and create a positive semi-definite matrix M = A * A^T
    // To keep it deterministic, we seed based on instrument pairs
    const M: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const hash = crypto.createHash('sha256').update(instrumentIds[i] + '_' + instrumentIds[j]).digest('hex');
        const val = (parseInt(hash.substring(0, 8), 16) / 0xffffffff) * 2 - 1; // -1 to 1
        M[i][j] = val;
      }
    }

    const A_At: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += M[i][k] * M[j][k];
        }
        A_At[i][j] = sum;
      }
    }

    // 3. Convert M to a proper Correlation matrix
    // Corr_ij = M_ij / sqrt(M_ii * M_jj)
    const Corr: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Corr[i][j] = A_At[i][j] / Math.sqrt(A_At[i][i] * A_At[j][j]);
      }
    }

    // 4. Shrinkage towards identity to ensure strictly positive definite
    // Corr = 0.5 * Corr + 0.5 * I
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          Corr[i][j] = 0.5 * Corr[i][j] + 0.5;
        } else {
          Corr[i][j] = 0.5 * Corr[i][j];
        }
      }
    }

    // 5. Calculate Covariance = diag(vols) * Corr * diag(vols)
    const Cov: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Cov[i][j] = vols[i] * Corr[i][j] * vols[j];
      }
    }

    return Cov;
  }
}
