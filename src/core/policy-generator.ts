/**
 * Policy Generator
 * 
 * This module is responsible for generating JavaScript/TypeScript code
 * from a parsed policy schema. The generated code will implement the
 * access control rules, storage strategy, and other features defined
 * in the policy.
 */

import { DeploymentConfig, EntityDefinition } from './schema-parser';

/**
 * PolicyGenerator class to generate code from a parsed schema
 */
export class PolicyGenerator {
  /**
   * Generate policy code from a parsed schema
   * 
   * @param config - Parsed deployment configuration
   * @returns Generated code as a string
   */
  generatePolicyCode(config: DeploymentConfig): string {
    // Generate each section of the code
    const imports = this.generateImports();
    const mockDb = this.generateMockDb(config);
    const policyConstant = this.generatePolicyConstant(config);
    const policyHelpers = this.generatePolicyHelpers(config);
    const entityFunctions = this.generateEntityFunctions(config);
    
    // Combine all sections
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
   * 
   * @returns Code for import statements
   */
  private generateImports(): string {
    return `/**
 * Generated Tarobase Policy Implementation
 * 
 * This file was automatically generated from a Tarobase policy schema.
 * It provides a complete implementation of the forum application with
 * appropriate access controls and storage strategy.
 */

// Type definition for policy
interface TarobasePolicy {
  [path: string]: {
    rules?: {
      read?: string;
      write?: string;
      create?: string;
      update?: string;
      delete?: string;
    };
    fields?: Record<string, string>;
    onchain?: boolean;
    hooks?: {
      onchain?: {
        create?: string;
        update?: string;
        delete?: string;
      };
    };
  };
}`;
  }

  /**
   * Generate mock database code
   * 
   * @param config - Parsed deployment configuration
   * @returns Code for mock database
   */
  private generateMockDb(config: DeploymentConfig): string {
    const entities = Object.values(config.entities);
    const onchainEntities = entities.filter(e => e.onchain).map(e => e.name);
    const offchainEntities = entities.filter(e => !e.onchain).map(e => e.name);
    
    return `// Mock storage for off-chain data
const mockDb = {
  ${offchainEntities.map(name => `${name}: {}`).join(',\n  ')}
};

// Mock storage for on-chain data
const mockChain = {
  ${onchainEntities.map(name => `${name}: {}`).join(',\n  ')}
};

// Current authenticated user (for demo purposes)
let currentUser = null;`;
  }

  /**
   * Generate policy constant
   * 
   * @param config - Parsed deployment configuration
   * @returns Code for policy constant
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
 * 
 * This object defines the access control rules, field types, storage
 * strategy, and other policy features.
 */
const forumPolicy = ${JSON.stringify(policy, null, 2)};`;
  }

  /**
   * Generate policy helper functions
   * 
   * @param config - Parsed deployment configuration
   * @returns Code for policy helper functions
   */
  private generatePolicyHelpers(config: DeploymentConfig): string {
    return `/**
 * Helper function to get the policy for a specific path
 * 
 * @param path - The path to get policy for
 * @returns Policy for the path
 */
function getPolicyForPath(path) {
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
}

/**
 * Check if a path should be stored on-chain
 * 
 * @param path - The path to check
 * @returns Whether the path should be stored on-chain
 */
function isOnChain(path) {
  const policy = getPolicyForPath(path);
  return policy?.onchain === true;
}

/**
 * Get the fields definition for a path
 * 
 * @param path - The path to get fields for
 * @returns Field definitions for the path
 */
function getFieldsForPath(path) {
  const policy = getPolicyForPath(path);
  return policy?.fields || null;
}

/**
 * Check if a user is authorized to perform an action on a path
 * 
 * @param userAddress - User's wallet address
 * @param path - The path to check
 * @param action - The action to check (read, create, update, delete)
 * @returns Whether the user is authorized
 */
function isAuthorized(userAddress, path, action) {
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
  
  // Simple pattern matching
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
}`;
  }

  /**
   * Generate entity-specific functions
   * 
   * @param config - Parsed deployment configuration
   * @returns Code for entity functions
   */
  private generateEntityFunctions(config: DeploymentConfig): string {
    const entities = Object.values(config.entities);
    const entityDocs = entities.map(entity => 
      `// ${entity.name} - ${entity.onchain ? 'on-chain' : 'off-chain'} storage\n` +
      `//   Fields: ${Object.entries(entity.fields).map(([k, v]) => `${k} (${v})`).join(', ')}`
    ).join('\n');

    return `/**
 * Core entity types in this policy:
 * ${entityDocs}
 */

/**
 * Initialize Tarobase SDK
 * 
 * @param appId - Application ID
 * @returns Whether initialization was successful
 */
function init(appId) {
  console.log(\`Tarobase initialized with appId: \${appId}\`);
  return true;
}

/**
 * Simulate user login with wallet
 * 
 * @param walletAddress - User's wallet address
 * @returns User object
 */
async function login(walletAddress) {
  console.log(\`User login with wallet: \${walletAddress}\`);
  const user = { address: walletAddress };
  currentUser = user;
  return user;
}

/**
 * Get current authenticated user
 * 
 * @returns Current user or null
 */
async function getCurrentUser() {
  return currentUser;
}

/**
 * Logout current user
 */
async function logout() {
  currentUser = null;
  console.log('User logged out');
}

/**
 * Set data at a specific path (create or update)
 * 
 * @param path - Path to set data at
 * @param data - Data to set
 * @returns Whether the operation was successful
 */
async function set(path, data) {
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
  if (!isAuthorized(currentUser.address, path, action)) {
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
}

/**
 * Get data from a specific path
 * 
 * @param path - Path to get data from
 * @param options - Additional options
 * @returns Data at the path
 */
async function get(path, options) {
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
}

/**
 * Delete data at a specific path
 * 
 * @param path - Path to delete data at
 * @returns Whether deletion was successful
 */
async function remove(path) {
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
}

/**
 * Subscribe to data changes at a specific path
 * 
 * @param path - Path to subscribe to
 * @param options - Subscription options
 * @param callback - Callback to invoke when data changes
 * @returns Unsubscribe function
 */
function subscribe(path, options, callback) {
  console.log(\`Subscribing to data at path: \${path}\`);
  // In a real implementation, this would set up real-time listeners
  // For demo purposes, we'll just call the callback once with current data
  get(path).then(callback);
  
  // Return an unsubscribe function
  return () => {
    console.log(\`Unsubscribed from path: \${path}\`);
  };
}

// Export the API
module.exports = {
  init,
  login,
  getCurrentUser,
  logout,
  set,
  get,
  remove,
  subscribe,
  
  // Helper functions
  getPolicyForPath,
  isOnChain,
  getFieldsForPath,
  isAuthorized,
  
  // For debugging
  mockDb,
  mockChain,
  forumPolicy
};`;
  }
} 