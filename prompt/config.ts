/**
 * Configuration for API endpoints
 */

/**
 * Build application configuration object based on app ID
 * 
 * @param appId The application ID
 * @returns Configuration object with API endpoints
 */
export function buildAppConfig(appId: string) {
  // Base URL for onchain API
  const onchainApiBaseURL = `https://api.onchain-lab.com/api/${appId}`;
  
  return {
    onchainApiBaseURL,
    appId
  };
} 