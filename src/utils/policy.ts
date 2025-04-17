import { TarobasePolicy } from '../types';

/**
 * Tarobase policy definition for our forum app
 * This defines the data structure and access rules
 */
export const forumPolicy: TarobasePolicy = {
  // User data
  "user": {
    "rules": {
      "read": "true", // All users can read public user data
      "create": "@newData.walletAddress == @user.address" // Users can only create their own profile
    },
    "fields": {
      "walletAddress": "String",
      "displayName": "String",
      "profileInfo": "String?",
      "joinedAt": "UInt"
    },
    "onchain": false // User data stored off-chain for efficiency
  },
  
  // Post data
  "post/$postId": {
    "rules": {
      "read": "true", // Everyone can read the basic post metadata
      "create": "@newData.createdBy == @user.address", // Only the authenticated user can create posts as themselves
      "update": "@resource.data.createdBy == @user.address", // Only the author can update their posts
      "delete": "@resource.data.createdBy == @user.address" // Only the author can delete their posts
    },
    "fields": {
      "postId": "String",
      "createdBy": "String",
      "title": "String",
      "preview": "String",
      "content": "String",
      "createdAt": "UInt",
      "isPaid": "Boolean",
      "price": "UInt?"
    },
    "onchain": true // Post data stored on-chain for immutability and verification
  },
  
  // Access rights for paid content
  "access/$postId/$walletAddress": {
    "rules": {
      "read": "@user.address == $walletAddress || @resource.data.createdBy == @user.address", // Users can only read their own access rights, or the author can check who has access
      "create": "@user.address == $walletAddress", // Users can only create access for themselves (after payment)
      "delete": "false" // Access rights cannot be deleted (once paid, always have access)
    },
    "fields": {
      "postId": "String",
      "walletAddress": "String",
      "hasAccess": "Boolean",
      "paidAt": "UInt?",
      "transactionId": "String?"
    },
    "onchain": true, // Access rights stored on-chain for verification
    "hooks": {
      "onchain": {
        "create": "verifyPayment($postId, $walletAddress)" // When access is created, verify payment was made
      }
    }
  }
};

/**
 * Helper function to get the policy for a specific path
 */
export const getPolicyForPath = (path: string): any => {
  if (path.startsWith("user/")) {
    return forumPolicy["user"];
  } else if (path.startsWith("post/")) {
    return forumPolicy["post/$postId"];
  } else if (path.startsWith("access/")) {
    return forumPolicy["access/$postId/$walletAddress"];
  }
  
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
 * This is a simplified version - in real Tarobase this would be handled by the SDK
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
  
  // For simplicity, we'll just check some common patterns
  if (rule.includes("@user.address") && rule.includes("==")) {
    if (rule.includes("@newData.createdBy == @user.address")) {
      // User trying to create data with their address as creator
      return true;
    }
    
    if (rule.includes("@resource.data.createdBy == @user.address")) {
      // Check if user is the creator (would require actual data lookup in real implementation)
      // For testing purposes, we'll just check if the path contains the user's address
      return path.includes(userAddress);
    }
  }
  
  return false;
}; 