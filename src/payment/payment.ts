import { AccessRight, Post } from '../types';
import * as tarobase from '../utils/tarobase';
import * as auth from '../auth/auth';
import * as posts from '../data/posts';

// Mock transaction ID generator
const generateTransactionId = (): string => {
  return '0x' + Math.random().toString(16).substring(2, 42);
};

/**
 * Check if a user has access to a post
 */
export const hasAccessToPost = async (walletAddress: string, postId: string): Promise<boolean> => {
  // Get the post
  const post = await posts.getPostById(postId);
  
  if (!post) {
    return false;
  }
  
  // If the post is not paid, everyone has access
  if (!post.isPaid) {
    return true;
  }
  
  // If the user is the author, they have access
  if (post.createdBy === walletAddress) {
    return true;
  }
  
  // Check if the user has purchased access
  const accessRight = await tarobase.get(`access/${postId}/${walletAddress}`);
  
  return !!accessRight && accessRight.hasAccess;
};

/**
 * Process payment for a post
 * In a real implementation, this would interact with a blockchain
 */
export const processPayment = async (postId: string): Promise<string> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to make a payment');
  }
  
  const post = await posts.getPostById(postId);
  
  if (!post) {
    throw new Error(`Post with ID ${postId} not found`);
  }
  
  // If the post is not paid, no payment is needed
  if (!post.isPaid) {
    throw new Error('This post does not require payment');
  }
  
  // If the user is the author, no payment is needed
  if (post.createdBy === currentUser.walletAddress) {
    throw new Error('You are the author of this post and already have access');
  }
  
  // Check if the user already has access
  const hasAccess = await hasAccessToPost(currentUser.walletAddress, postId);
  
  if (hasAccess) {
    throw new Error('You already have access to this post');
  }
  
  // Process the payment (in a real implementation, this would verify a blockchain transaction)
  const transactionId = generateTransactionId();
  
  // Record the access right (this will be stored on-chain based on policy)
  const accessRight: AccessRight = {
    walletAddress: currentUser.walletAddress,
    postId,
    hasAccess: true,
    paidAt: Date.now(),
    transactionId
  };
  
  // Store in access collection (stored on-chain according to policy)
  await tarobase.set(`access/${postId}/${currentUser.walletAddress}`, accessRight);
  
  return transactionId;
};

/**
 * Get post content with access check
 */
export const getPostContent = async (postId: string): Promise<string | null> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to view post content');
  }
  
  // Get the post
  const post = await posts.getPostById(postId);
  
  if (!post) {
    throw new Error(`Post with ID ${postId} not found`);
  }
  
  // Check if the user has access to the post
  const hasAccess = await hasAccessToPost(currentUser.walletAddress, postId);
  
  if (!hasAccess) {
    if (post.isPaid) {
      throw new Error('You need to pay to access this content');
    } else {
      throw new Error('You do not have access to this content');
    }
  }
  
  return post.content;
};

/**
 * Get all purchased posts for a user
 */
export const getPurchasedPosts = async (): Promise<Post[]> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to view purchased posts');
  }
  
  // Get all access rights for the user (requires querying across all posts)
  // This is a simplified implementation - in a real app, you would have a more efficient query
  // to find all access rights for a specific user
  const allPosts = await posts.getAllPosts();
  const purchasedPosts: Post[] = [];
  
  for (const post of allPosts) {
    if (post.isPaid && post.createdBy !== currentUser.walletAddress) {
      // Check if user has access to this paid post
      const accessRight = await tarobase.get(`access/${post.postId}/${currentUser.walletAddress}`);
      if (accessRight && accessRight.hasAccess) {
        purchasedPosts.push(post);
      }
    }
  }
  
  return purchasedPosts;
};
