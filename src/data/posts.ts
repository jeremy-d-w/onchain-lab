import { Post } from '../types';
import * as tarobase from '../utils/tarobase';
import * as auth from '../auth/auth';

// Mock UUID generator
const mockUuid = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Create a new post
 */
export const createPost = async (
  title: string,
  preview: string,
  content: string,
  isPaid: boolean = false,
  price?: number
): Promise<Post | null> => {
  // Get the current user
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to create a post');
  }
  
  const postId = mockUuid();
  
  const post: Post = {
    postId,
    title,
    preview,
    content,
    createdBy: currentUser.walletAddress,
    createdAt: Date.now(),
    isPaid,
    price: isPaid ? (price || 1) : undefined // Default to $1 if paid but no price specified
  };
  
  // Store post data on-chain according to policy
  await tarobase.set(`post/${postId}`, post);
  
  return post;
};

/**
 * Get a post by ID
 * Note: This returns the full post object, but the content field
 * will be accessible only if the user has access rights
 */
export const getPostById = async (postId: string): Promise<Post | null> => {
  return await tarobase.get(`post/${postId}`);
};

/**
 * Get all posts
 */
export const getAllPosts = async (): Promise<Post[]> => {
  return await tarobase.get('post');
};

/**
 * Get posts by author
 */
export const getPostsByAuthor = async (authorAddress: string): Promise<Post[]> => {
  const allPosts = await getAllPosts();
  return allPosts.filter(post => post.createdBy === authorAddress);
};

/**
 * Delete a post
 * Authorization is handled by the policy
 */
export const deletePost = async (postId: string): Promise<boolean> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to delete a post');
  }
  
  // Check if the user is authorized to delete this post
  const isAuthorized = await auth.isAuthorized(`post/${postId}`, 'delete');
  
  if (!isAuthorized) {
    throw new Error('You are not authorized to delete this post');
  }
  
  // Delete the post - tarobase.remove will check authorization again via policy
  return await tarobase.remove(`post/${postId}`);
};

/**
 * Update a post
 * Authorization is handled by the policy
 */
export const updatePost = async (
  postId: string,
  updates: Partial<Omit<Post, 'postId' | 'createdBy' | 'createdAt'>>
): Promise<Post | null> => {
  const currentUser = await auth.getCurrentUser();
  
  if (!currentUser) {
    throw new Error('You must be logged in to update a post');
  }
  
  const post = await getPostById(postId);
  
  if (!post) {
    throw new Error(`Post with ID ${postId} not found`);
  }
  
  // Check authorization
  const isAuthorized = await auth.isAuthorized(`post/${postId}`, 'update');
  
  if (!isAuthorized) {
    throw new Error('You are not authorized to update this post');
  }
  
  // Update the post
  const updatedPost = {
    ...post,
    ...updates
  };
  
  await tarobase.set(`post/${postId}`, updatedPost);
  
  return updatedPost;
};
