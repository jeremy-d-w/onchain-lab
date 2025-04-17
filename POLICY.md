# Tarobase Policy Structure

This document explains the policy structure used in our Web3 Forum application with Tarobase.

## Overview

Tarobase uses a policy-based approach to define:
1. Data structure (fields and types)
2. Access control (read/write permissions)
3. Storage location (on-chain vs off-chain)
4. Action hooks (code that runs after data changes)

## Our Forum Application Policy

Our forum application uses the following policy structure:

```javascript
{
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
}
```

## Policy Rules

Tarobase uses policy rules to control access to data. The rules are expressions that evaluate to either true or false. Some special variables you can use in rules:

- `@user` - The currently authenticated user
- `@newData` - The data being written (for create or update operations)
- `@resource.data` - The existing data (for update or delete operations)
- `$wildcardName` - Path wildcards that match dynamic segments

## On-Chain vs Off-Chain Storage

Our policy specifies which data should be stored on-chain versus off-chain:

1. **User data**: Stored off-chain for efficiency
   - User profiles don't require blockchain verification
   - Faster access and lower cost

2. **Post data**: Stored on-chain for immutability
   - Ensures content cannot be tampered with
   - Provides timestamp verification
   - Creates a permanent record of publication

3. **Access rights**: Stored on-chain for verification
   - Creates a verifiable record of payment
   - Ensures access rights cannot be manipulated
   - Hooks can trigger additional on-chain actions

## Implementation

In our application:

1. Data access follows the rules defined in the policy
2. Storage location (on-chain vs off-chain) is automatically determined by the policy
3. Authentication and authorization are integrated with the policy
4. The pay-to-read functionality leverages on-chain verification 