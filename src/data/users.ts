import { User } from '../types';
import * as tarobase from '../utils/tarobase';
import * as auth from '../auth/auth';

/**
 * Get user by wallet address (re-exporting from auth)
 */
export const getUserByWalletAddress = auth.getUserByWalletAddress;

/**
 * Create a new user (re-exporting from auth)
 */
export const createUser = auth.createUser;

/**
 * Get all users
 */
export const getAllUsers = async (): Promise<User[]> => {
  return await tarobase.get('user');
};

/**
 * Update a user profile
 * Authorization is handled by policy
 */
export const updateUserProfile = async (
  walletAddress: string,
  updates: Partial<Omit<User, 'walletAddress' | 'joinedAt'>>
): Promise<User | null> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to update a profile');
  }
  
  // Users can only update their own profile according to policy
  const isAuthorized = await auth.isAuthorized(`user/${walletAddress}`, 'update');
  
  if (!isAuthorized) {
    throw new Error('You can only update your own profile');
  }
  
  const user = await getUserByWalletAddress(walletAddress);
  
  if (!user) {
    throw new Error(`User with wallet address ${walletAddress} not found`);
  }
  
  // Update the user
  const updatedUser = {
    ...user,
    ...updates
  };
  
  await tarobase.set(`user/${walletAddress}`, updatedUser);
  
  return updatedUser;
};
