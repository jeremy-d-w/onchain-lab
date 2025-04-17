/**
 * Tarobase Types
 * 
 * This module provides shared type definitions for the Tarobase system.
 */

/**
 * Tarobase policy definition
 */
export interface TarobasePolicy {
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
}

/**
 * User type definition
 */
export interface User {
  walletAddress: string;
  displayName: string;
  profileInfo?: string;
  joinedAt: number; // Timestamp
}

/**
 * Post type definition
 */
export interface Post {
  postId: string;
  createdBy: string; // Author wallet address
  title: string;
  preview: string; // Public snippet
  content: string; // Full content, only accessible if paid or free
  createdAt: number; // Timestamp
  isPaid: boolean;
  price?: number; // Price in USD (simulated)
}

/**
 * Access rights type definition
 */
export interface AccessRight {
  walletAddress: string;
  postId: string;
  hasAccess: boolean;
  paidAt?: number; // Timestamp
  transactionId?: string;
}

export namespace TarobaseTypes {
  export type Policy = TarobasePolicy;
  export type UserData = User;
  export type PostData = Post;
  export type AccessData = AccessRight;
}
