import { User } from '../types';
import * as tarobase from '../utils/tarobase';
import { isAuthorized as policyIsAuthorized } from '../utils/policy';

/**
 * Create a new user in the system
 */
export const createUser = async (walletAddress: string, displayName: string, profileInfo?: string): Promise<User> => {
  // Check if user already exists
  const existingUser = await getUserByWalletAddress(walletAddress);
  if (existingUser) {
    return existingUser;
  }

  const user: User = {
    walletAddress,
    displayName,
    profileInfo,
    joinedAt: Date.now()
  };

  // Store user data (off-chain according to policy)
  await tarobase.set(`user/${walletAddress}`, user);
  
  return user;
};

/**
 * Get user by wallet address
 */
export const getUserByWalletAddress = async (walletAddress: string): Promise<User | null> => {
  return await tarobase.get(`user/${walletAddress}`);
};

/**
 * Authenticate a user with their wallet
 * In a real implementation, this would verify a wallet signature
 */
export const authenticateUser = async (walletAddress: string): Promise<{ address: string }> => {
  // First ensure the user exists in our system
  const user = await getUserByWalletAddress(walletAddress);
  
  if (!user) {
    throw new Error(`User with wallet address ${walletAddress} does not exist`);
  }
  
  // Login with Tarobase
  return await tarobase.login(walletAddress);
};

/**
 * Get the currently authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const taroUser = await tarobase.getCurrentUser();
  
  if (!taroUser) {
    return null;
  }
  
  return await getUserByWalletAddress(taroUser.address);
};

/**
 * Check if a user is authorized to perform an action
 * Uses the policy rules defined in policy.ts
 */
export const isAuthorized = async (resource: string, action: 'read' | 'create' | 'update' | 'delete'): Promise<boolean> => {
  const currentUser = await tarobase.getCurrentUser();
  
  if (!currentUser) {
    return false;
  }
  
  return policyIsAuthorized(currentUser.address, resource, action);
};

/**
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  await tarobase.logout();
};
