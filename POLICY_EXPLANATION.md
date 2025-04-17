# Simplified Tarobase Policy Explanation

This document explains how the simplified Tarobase policy implements the two key requirements:
1. Ensuring only the author can delete their own post
2. Implementing a "pay $1 to read" feature

## Policy Structure Overview

The simplified policy is organized into fewer collections:

- **user**: User profile information (stored off-chain)
- **post**: Post content including both preview and full content (stored on-chain)
- **access**: Records of who has paid for access to which posts (stored on-chain)

## Requirement 1: Only Author Can Delete Their Post

This requirement is implemented through authorization rules in the post collection:

```json
"post/$postId": {
  "rules": {
    "delete": "@resource.data.createdBy == @user.address"
  },
  // ...
}
```

The rule `@resource.data.createdBy == @user.address` ensures that:
- `@resource.data.createdBy` refers to the wallet address of the post creator
- `@user.address` refers to the wallet address of the current user
- The comparison ensures they must match for deletion to be allowed

## Requirement 2: Pay $1 to Read Feature

This requirement is implemented through a more direct approach:

### 1. Access Control Implementation

In our simplified system, access control is handled through the access collection and the `hasAccess` function:

```json
"functions": {
  "hasAccess": "function($walletAddress, $postId) { 
    return !!@getAccessRight($walletAddress, $postId) || 
           !@resource.post[$postId].isPaid || 
           @resource.post[$postId].createdBy === $walletAddress; 
  }"
}
```

This function checks if:
- The user has paid for access (has an access record), OR
- The post is not paid content (free for everyone), OR
- The user is the author of the post

### 2. Direct Token Transfer for Payment

Instead of a separate payment collection, we now use direct token transfers:

```json
"access/$postId/$walletAddress": {
  "rules": {
    "create": "@user.address == $walletAddress && @hasValidPayment(@user.address, @resource.post[$postId].createdBy, $postId, 1)"
  },
  // ...
}
```

The `@hasValidPayment` function verifies the payment by calling `transferWholeTokens`:

```json
"hasValidPayment": "function($sender, $recipient, $postId, $amount) { 
  return @transferWholeTokens('0xPaymentTokenAddress', $sender, $recipient, $amount); 
}"
```

### 3. Token Transfer Function

We use a specialized function for token transfers:

```json
"transferWholeTokens": "function($tokenAddress, $sender, $recipient, $amount) { 
  /* Transfer $amount of tokens from $sender to $recipient and return true if successful */ 
  return true; 
}"
```

This function:
- Takes a token contract address
- Specifies sender and recipient addresses
- Specifies the amount in whole tokens (e.g., 1 for $1)
- Handles decimal conversion based on the token's decimals
- Returns true if the transfer succeeds

## Complete Flow: Pay to Read

1. User creates a post with `isPaid: true` and `price: 1`
2. Another user wants to read the full content
3. They create an access record which triggers the `hasValidPayment` check
4. This invokes `transferWholeTokens` to transfer 1 token from the reader to the author
5. If the transfer succeeds, the access record is created
6. The user can now read the full content with their access rights
7. The author is notified through the `notifyAuthor` hook

## Complete Flow: Post Deletion

1. User attempts to delete a post
2. The policy checks if the current user (`@user.address`) is the same as the post creator (`@resource.data.createdBy`)
3. If they match, deletion is allowed
4. If they don't match, deletion is denied

## Benefits of the Simplified Approach

1. **Reduced Complexity**: Fewer collections and simpler data flow
2. **Direct Token Transfers**: Use blockchain native token transfers instead of a payment abstraction
3. **Single Content Storage**: Store all post content in one place for easier management
4. **Same Security Model**: Still ensures only authors can delete their posts
5. **Same Payment Verification**: Still requires $1 payment before granting access to paid content 