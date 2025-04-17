import { DeploymentConfig, EntityDefinition } from './schema-parser';

/**
 * PolicyGenerator class to generate TypeScript code from a parsed schema
 */
export class PolicyGenerator {
  /**
   * Generate TypeScript code from a parsed schema
   */
  generatePolicyCode(config: DeploymentConfig): string {
    const imports = this.generateImports();
    const mockDb = this.generateMockDb(config);
    const policyConstant = this.generatePolicyConstant(config);
    const policyHelpers = this.generatePolicyHelpers(config);
    const entityFunctions = this.generateEntityFunctions(config);
    
    return [
      imports,
      mockDb,
      policyConstant,
      policyHelpers,
      entityFunctions
    ].join('\n\n');
  }

  /**
   * Generate import statements
   */
  private generateImports(): string {
    return `import { TarobasePolicy } from '../types';`;
  }

  /**
   * Generate mock database code
   */
  private generateMockDb(config: DeploymentConfig): string {
    const entities = Object.values(config.entities);
    const onchainEntities = entities.filter(e => e.onchain).map(e => e.name);
    const offchainEntities = entities.filter(e => !e.onchain).map(e => e.name);
    
    return `// Mock storage for our simulated database
const mockDb: Record<string, any> = {
  ${offchainEntities.map(name => `${name}: {}`).join(',\n  ')}
};

// Mock on-chain storage
const mockChain: Record<string, any> = {
  ${onchainEntities.map(name => `${name}: {}`).join(',\n  ')}
};

// Mock current authenticated user
let currentUser: { address: string } | null = null;`;
  }

  /**
   * Generate policy constant
   */
  private generatePolicyConstant(config: DeploymentConfig): string {
    // Convert the deployment config back to a policy format
    const policy: any = {};
    
    for (const [name, entity] of Object.entries(config.entities)) {
      policy[entity.path] = {
        rules: config.rules[name] || {},
        fields: entity.fields,
        onchain: entity.onchain
      };
      
      if (config.hooks[name]) {
        policy[entity.path].hooks = config.hooks[name];
      }
    }
    
    if (config.functions) {
      policy.functions = {};
      for (const [name, func] of Object.entries(config.functions)) {
        // Extract function source - this is simplified and would need more robust handling
        const funcString = func.toString();
        policy.functions[name] = funcString;
      }
    }
    
    return `/**
 * Tarobase policy definition
 */
export const forumPolicy: TarobasePolicy = ${JSON.stringify(policy, null, 2)};`;
  }

  /**
   * Generate policy helper functions
   */
  private generatePolicyHelpers(config: DeploymentConfig): string {
    return `/**
 * Helper function to get the policy for a specific path
 */
export const getPolicyForPath = (path: string): any => {
  ${Object.values(config.entities).map(entity => {
    // Check if the path contains wildcards
    if (entity.wildcards && entity.wildcards.length > 0) {
      // Create a pattern to match paths with wildcards
      const pattern = entity.path.replace(/\$[a-zA-Z0-9]+/g, '[^/]+');
      return `if (path.match(/^${pattern}$/)) {\n    return forumPolicy["${entity.path}"];\n  }`;
    } else {
      return `if (path.startsWith("${entity.path}")) {\n    return forumPolicy["${entity.path}"];\n  }`;
    }
  }).join('\n  ')}
  
  return null;
};

/**
 * Check if a path should be stored on-chain based on policy
 */
export const isOnChain = (path: string): boolean => {
  const policy = getPolicyForPath(path);
  return policy?.onchain === true;
};

/**
 * Get the fields definition for a path
 */
export const getFieldsForPath = (path: string): Record<string, string> | null => {
  const policy = getPolicyForPath(path);
  return policy?.fields || null;
};

/**
 * Check if a user is authorized to perform an action on a path
 */
export const isAuthorized = (
  userAddress: string, 
  path: string, 
  action: 'read' | 'create' | 'update' | 'delete'
): boolean => {
  const policy = getPolicyForPath(path);
  
  if (!policy || !policy.rules || !policy.rules[action]) {
    return false;
  }
  
  // Very simplified rule evaluation
  const rule = policy.rules[action];
  
  // If rule is "true", always allow
  if (rule === "true") {
    return true;
  }
  
  // If rule is "false", always deny
  if (rule === "false") {
    return false;
  }
  
  // In a real implementation, this would use the RuleEngine to evaluate the rule
  console.log(\`Evaluating rule: \${rule}\`);
  
  // For demonstration purposes, we'll include some basic pattern matching
  // In a production system, we'd use the full rule engine
  if (rule.includes("@user.address") && rule.includes("==")) {
    if (rule.includes("@newData.createdBy == @user.address") || 
        rule.includes("@user.address == @newData.createdBy")) {
      // User trying to create data with their address as creator
      return true;
    }
    
    if (rule.includes("@resource.data.createdBy == @user.address") ||
        rule.includes("@user.address == @resource.data.createdBy")) {
      // Check if user is the creator (would require actual data lookup in real implementation)
      // For testing purposes, we'll just check if the path contains the user's address
      return path.includes(userAddress);
    }
  }
  
  return false;
};`;
  }

  /**
   * Generate entity-specific functions
   */
  private generateEntityFunctions(config: DeploymentConfig): string {
    return `/**
 * Initialize Tarobase SDK
 */
export const init = (appId: string) => {
  console.log(\`Tarobase initialized with appId: \${appId}\`);
  return true;
};

/**
 * Simulate user login with wallet
 */
export const login = async (walletAddress: string): Promise<{ address: string }> => {
  console.log(\`User login with wallet: \${walletAddress}\`);
  const user = { address: walletAddress };
  currentUser = user;
  return user;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<{ address: string } | null> => {
  return currentUser;
};

/**
 * Logout current user
 */
export const logout = async (): Promise<void> => {
  currentUser = null;
  console.log('User logged out');
};

/**
 * Set data at a specific path (create or update)
 */
export const set = async (path: string, data: any): Promise<boolean> => {
  if (!currentUser) {
    throw new Error('Authentication required');
  }

  console.log(\`Setting data at path: \${path}\`);
  
  const [collection, id, ...rest] = path.split('/');
  
  if (!collection || !id) {
    throw new Error('Invalid path format. Expected format: collection/id');
  }

  // Check if the user is authorized to create/update this data
  const action = path.includes(id) ? 'update' : 'create';
  if (!isAuthorized(currentUser.address, path, action as any)) {
    throw new Error(\`Not authorized to \${action} at path: \${path}\`);
  }

  // Determine if this data should be stored on-chain
  const isOnChainData = isOnChain(path);
  console.log(\`Storing data \${isOnChainData ? 'on-chain' : 'off-chain'} at path: \${path}\`);

  // Get the storage target based on on-chain status
  const storage = isOnChainData ? mockChain : mockDb;
  
  if (!storage[collection]) {
    storage[collection] = {};
  }

  // Handle nested paths
  if (rest.length > 0) {
    if (!storage[collection][id]) {
      storage[collection][id] = {};
    }
    
    let current = storage[collection][id];
    for (let i = 0; i < rest.length - 1; i++) {
      if (!current[rest[i]]) {
        current[rest[i]] = {};
      }
      current = current[rest[i]];
    }
    
    current[rest[rest.length - 1]] = data;
  } else {
    storage[collection][id] = data;
  }

  return true;
};

/**
 * Get data from a specific path
 */
export const get = async (path: string, options?: any): Promise<any> => {
  console.log(\`Getting data from path: \${path}\`);
  
  const [collection, id, ...rest] = path.split('/');
  
  if (!collection) {
    throw new Error('Invalid path format. Expected format: collection/id');
  }

  // Check authorization for read if a user is logged in
  if (currentUser && !isAuthorized(currentUser.address, path, 'read')) {
    throw new Error(\`Not authorized to read from path: \${path}\`);
  }

  // Determine if this data is stored on-chain
  const isOnChainData = isOnChain(path);
  
  // Get the storage source based on on-chain status
  const storage = isOnChainData ? mockChain : mockDb;

  if (!storage[collection]) {
    return null;
  }

  // If only collection is specified, return all items
  if (!id) {
    return Object.values(storage[collection]);
  }

  if (!storage[collection][id]) {
    return null;
  }

  // Handle nested paths
  if (rest.length > 0) {
    let current = storage[collection][id];
    for (const key of rest) {
      if (!current || !current[key]) {
        return null;
      }
      current = current[key];
    }
    return current;
  }

  return storage[collection][id];
};

/**
 * Delete data at a specific path
 */
export const remove = async (path: string): Promise<boolean> => {
  if (!currentUser) {
    throw new Error('Authentication required');
  }

  console.log(\`Removing data at path: \${path}\`);
  
  const [collection, id, ...rest] = path.split('/');
  
  if (!collection || !id) {
    throw new Error('Invalid path format. Expected format: collection/id');
  }

  // Check if the user is authorized to delete this data
  if (!isAuthorized(currentUser.address, path, 'delete')) {
    throw new Error(\`Not authorized to delete at path: \${path}\`);
  }

  // Determine if this data is stored on-chain
  const isOnChainData = isOnChain(path);
  
  // Get the storage target based on on-chain status
  const storage = isOnChainData ? mockChain : mockDb;

  if (!storage[collection] || !storage[collection][id]) {
    return false;
  }

  // Handle nested paths
  if (rest.length > 0) {
    let current = storage[collection][id];
    let parent = null;
    let lastKey = '';
    
    for (let i = 0; i < rest.length; i++) {
      if (!current || !current[rest[i]]) {
        return false;
      }
      if (i === rest.length - 1) {
        parent = current;
        lastKey = rest[i];
      } else {
        current = current[rest[i]];
      }
    }
    
    if (parent && lastKey) {
      delete parent[lastKey];
      return true;
    }
    return false;
  }

  delete storage[collection][id];
  return true;
};

/**
 * Subscribe to data changes at a specific path
 */
export const subscribe = (path: string, options: any, callback: (data: any) => void) => {
  console.log(\`Subscribing to data at path: \${path}\`);
  // In a real implementation, this would set up real-time listeners
  // For mock purposes, we'll just call the callback once with current data
  get(path).then(callback);
  
  // Return an unsubscribe function
  return () => {
    console.log(\`Unsubscribed from path: \${path}\`);
  };
};

// Utility function to get the full database (for debugging)
export const getMockDb = () => {
  return {
    offChain: mockDb,
    onChain: mockChain
  };
};`;
  }
} 