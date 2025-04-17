import { buildAppConfig } from './config'

export function PROMPT_WEB3_APP(appId: string) {
  const { onchainApiBaseURL } = buildAppConfig(appId)

  return `
Use the provided onchain-lab APIs to handle authentication, data management, and payments in your web3 application.

The workflow for generating a web3 application is:
1. Convert user requirements into a policy schema (like tarobase-policy.json)
2. The backend parses this schema and generates API endpoints
3. Generate frontend code that uses these endpoints to interact with the blockchain

## Schema Structure
When converting user requirements to schema, include:
- Entity definitions with fields (User, Post, AccessRights, etc.)
- Access rules for CRUD operations
- Onchain flags for data that should be stored on blockchain
- Hooks for blockchain events
- Custom functions for complex logic

## Auth Module
Use the auth module for user authentication with crypto wallets:
- createUser(walletAddress, displayName, profileInfo): Creates a new user
- authenticateUser(walletAddress): Authenticates a wallet
- getCurrentUser(): Gets the currently authenticated user
- isAuthorized(resource, action): Checks if user is authorized for an action
- logout(): Logs out the current user

## Data Module
Use the data module for content management:
- createItem(title, preview, content, isPaid, price): Creates a new item
- getItemById(itemId): Gets an item by ID
- getAllItems(): Gets all items
- getItemsByAuthor(authorAddress): Gets items by author
- deleteItem(itemId): Deletes an item (only author can delete)
- updateItem(itemId, updates): Updates an item

## Payment Module
Use the payment module for handling payments to access content:
- processPayment(itemId): Process payment for an item (returns transaction ID)
- hasAccessToItem(walletAddress, itemId): Checks if user has access
- getItemContent(itemId): Gets item content with access check
- getPurchasedItems(): Gets all purchased items for current user

## Implementation Example: Web3 Forum
${getForumExample(appId).trim()}
`.trim()
}

function getForumExample(appId: string): string {
  return `
// Example: Converting user requirements to schema for a Web3 Forum
// User requirements:
// 1. Users can create posts
// 2. Only the creator can delete their posts
// 3. Other users must pay $1 to read posts

// Step 1: Create schema (system generates this automatically)
const forumSchema = {
  "user": {
    "fields": { "walletAddress": "String", "displayName": "String", "profileInfo": "String?" },
    "rules": { "read": "true", "write": "@newData.walletAddress == @user.address" },
    "onchain": true
  },
  "post/$postId": {
    "fields": {
      "postId": "String", "createdBy": "String", "title": "String", 
      "preview": "String", "content": "String", "isPaid": "Boolean", "price": "UInt?"
    },
    "rules": {
      "read": "true",
      "create": "@newData.createdBy == @user.address",
      "delete": "@resource.data.createdBy == @user.address"
    },
    "onchain": true
  },
  "access/$postId/$walletAddress": {
    "fields": {
      "postId": "String", "walletAddress": "String", "hasAccess": "Boolean",
      "paidAt": "UInt", "transactionId": "String"
    },
    "rules": {
      "read": "@user.address == $walletAddress", 
      "create": "@user.address == $walletAddress && @hasValidPayment()"
    },
    "onchain": true
  }
};

// Step 2: Frontend implementation using generated API
import { OnchainClient } from '@devfunlabs/onchain-client';

// Initialize client with the generated appId
const client = new OnchainClient({ appId: '${appId}', baseURL: 'https://api.onchain-lab.com/api' });

// 1. Forum User Authentication
async function connectForumUser() {
  // Connect user wallet (e.g., using MetaMask)
  const walletAddress = await window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(accounts => accounts[0]);
  
  try {
    // Authenticate with wallet
    await client.auth.authenticateUser(walletAddress);
    
    // Create or get user profile
    const user = await client.auth.createUser(
      walletAddress,
      "User_" + walletAddress.substring(0, 6),
      "Forum user"
    );
    
    return user;
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    return null;
  }
}

// 2. Forum Post Management
async function createForumPost(title, preview, content, isPaid = false, price = 1) {
  try {
    const post = await client.data.createItem(
      title,
      preview,
      content,
      isPaid,
      price
    );
    return post;
  } catch (error) {
    console.error("Failed to create post:", error);
    return null;
  }
}

async function getForumPosts() {
  try {
    const posts = await client.data.getAllItems();
    return posts.map(post => ({
      id: post.postId,
      title: post.title,
      preview: post.preview,
      author: post.createdBy,
      isPaid: post.isPaid,
      price: post.price || 1
    }));
  } catch (error) {
    console.error("Failed to get posts:", error);
    return [];
  }
}

async function deleteForumPost(postId) {
  try {
    // Only the owner can delete (enforced by backend rules)
    const deleted = await client.data.deleteItem(postId);
    return deleted;
  } catch (error) {
    console.error("Failed to delete post:", error);
    return false;
  }
}

// 3. Forum Payment & Access Control
async function payToReadPost(postId) {
  try {
    // Process the payment transaction
    const transactionId = await client.payment.processPayment(postId);
    
    // After payment, access the content
    const content = await client.payment.getItemContent(postId);
    
    return { transactionId, content };
  } catch (error) {
    console.error("Failed to pay for post access:", error);
    return null;
  }
}

async function readForumPost(postId) {
  try {
    // This will only return content if user has access
    const content = await client.payment.getItemContent(postId);
    return content;
  } catch (error) {
    // Will throw if user doesn't have access
    console.error("Access denied. You need to pay to read this post.");
    return null;
  }
}

// 4. UI Component Example: Post List with Payment
function ForumPostsList() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    async function loadData() {
      const currentUser = await client.auth.getCurrentUser();
      setUser(currentUser);
      const forumPosts = await getForumPosts();
      setPosts(forumPosts);
    }
    loadData();
  }, []);
  
  async function handlePayAndRead(postId) {
    if (!user) {
      await connectForumUser();
    }
    const result = await payToReadPost(postId);
    if (result?.content) {
      // Display content in modal/dialog
      showPostContent(result.content);
    }
  }
  
  return \`
    <div className="forum-posts">
      {posts.map(post => (
        <div className="post-card" key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.preview}...</p>
          <div className="post-footer">
            <span>By: {post.author}</span>
            {post.isPaid ? (
              <button onClick={() => handlePayAndRead(post.id)}>
                Pay \${post.price} to read
              </button>
            ) : (
              <button onClick={() => readForumPost(post.id)}>
                Read Post
              </button>
            )}
            {user?.walletAddress === post.author && (
              <button onClick={() => deleteForumPost(post.id)}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  \`;
}
`
} 