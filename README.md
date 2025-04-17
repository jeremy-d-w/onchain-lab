# Web3 Forum App with Tarobase

A web3 forum application built with Tarobase that demonstrates key features:

1. User post creation
2. Post authorization (only the author can delete their posts)
3. Pay-to-read functionality

## Features

- **User Authentication**: Web3 wallet-based authentication
- **Post Management**: Create, read, update, and delete posts
- **Authorization**: Policy-based access control using Tarobase rules
- **Pay-to-Read**: Users must pay to access premium content
- **On-Chain & Off-Chain Storage**: Strategic data storage based on policy

## Project Structure

```
forum-lab/
├── src/
│   ├── auth/           # Authentication logic
│   ├── data/           # Data management (users, posts)
│   ├── payment/        # Payment processing
│   ├── types/          # TypeScript type definitions
│   ├── utils/
│   │   ├── tarobase.ts # Tarobase SDK wrapper
│   │   └── policy.ts   # Policy definitions and helpers
│   └── index.ts        # Main application entry point
├── POLICY.md           # Documentation about policy structure
├── package.json
└── tsconfig.json
```

## Key Components

1. **User Management**
   - Create users with wallet addresses
   - Web3 authentication
   - Off-chain storage for efficiency

2. **Post Management**
   - Create posts with optional paid content
   - On-chain storage for immutability
   - Policy-based authorization for post deletion

3. **Payment System**
   - Process payments for accessing premium content
   - Track access rights on-chain
   - Simulate blockchain transactions

## Implementation with Tarobase Policies

The application uses Tarobase as the backend, with a policy-based approach:

```javascript
// Post policy example
"post/$postId": {
  "rules": {
    "read": "true",
    "create": "@newData.createdBy == @user.address", 
    "update": "@resource.data.createdBy == @user.address",
    "delete": "@resource.data.createdBy == @user.address" 
  },
  "fields": {
    "postId": "String",
    "createdBy": "String",
    "title": "String",
    // more fields...
  },
  "onchain": true // Stored on blockchain
}
```

See [POLICY.md](./POLICY.md) for detailed policy explanations.

### 1. User Post Creation

```typescript
// Create a post as the authenticated user (stored on-chain)
const post = await posts.createPost(
  'Introduction to Web3',
  'A brief preview...',
  'Full content...',
  true, // isPaid
  1 // $1 price
);
```

### 2. Post Deletion Authorization

```typescript
// Only the author can delete their posts (enforced by policy)
try {
  await posts.deletePost(postId);
} catch (error) {
  console.error('Not authorized to delete this post');
}
```

### 3. Pay-to-Read Functionality

```typescript
// Process payment for a post
const transactionId = await payment.processPayment(postId);

// Access rights recorded on-chain
await tarobase.set(`access/${postId}/${userAddress}`, accessRight);

// Access the post content after payment
const content = await payment.getPostContent(postId);
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the demo: `npm run dev`

## Future Enhancements

- Frontend implementation with web3 wallet integration
- Real blockchain integration with smart contracts
- Enhanced policy management for complex use cases
- Content moderation features using policy hooks 