import { storage } from "./storage";

export type DeploymentMode = 'saas' | 'self-hosted';

export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE as DeploymentMode;
  return mode === 'self-hosted' ? 'self-hosted' : 'saas';
}

export function isSaasMode(): boolean {
  return getDeploymentMode() === 'saas';
}

export function isSelfHostedMode(): boolean {
  return getDeploymentMode() === 'self-hosted';
}

export async function isSetupCompleted(): Promise<boolean> {
  const deployment = await storage.getDeployment();
  return deployment?.setupCompleted ?? false;
}

export async function hasValidLicense(): Promise<boolean> {
  if (isSaasMode()) {
    return true;
  }

  const deployment = await storage.getDeployment();
  
  if (!deployment?.licenseKey || !deployment?.validUntil) {
    return false;
  }

  const now = new Date();
  const gracePeriodDays = 3;
  const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
  
  if (deployment.validUntil > now) {
    return true;
  }

  if (deployment.lastValidated) {
    const timeSinceLastValidation = now.getTime() - deployment.lastValidated.getTime();
    if (timeSinceLastValidation <= gracePeriodMs) {
      return true;
    }
  }

  return false;
}
