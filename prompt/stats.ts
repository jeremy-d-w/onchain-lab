import { buildAppConfig } from './config'

export function PROMPT_STATE(appId: string) {
  const { stateApiBaseURL } = buildAppConfig(appId)

  return `
Use state api with @devfunlabs/state-client if the user requests data persistence.
Use this baseURL: "${stateApiBaseURL}" and this appId: ${appId}. If the current code does not use this url and appId, it needs to be replaced with this url and appId.
The StateClient class is designed to make it easier to interact with your backend API for managing entities. It provides methods for creating, retrieving, updating, and deleting entities.
In StateClient, the first parameter of the method is always the entity name.
Here is an overview of how to use the StateClient along with some example code:

<example>
${example(appId, stateApiBaseURL).trim()}
</example>
`.trim()
}

export function example(appId: string, stateApiBaseURL: string) {
  return `
import { StateClient } from '@devfunlabs/state-client';

// Initialize the StateClient
const client = new StateClient({ baseURL: '${stateApiBaseURL}', appId: '${appId}' });

// Create a new entity. IMPORTANT: The entity id is required and must be unique.
const id = Date.now().toString()
const newEntityData = { id, name: 'John Doe', age: 30 };
const createdEntity = await client.createEntity('users', newEntityData) // params: entityName, entityData

// Retrieve all entities
const allEntities = await client.getEntities('users') // params: entityName
// Retrieve entities with filter
const filteredEntities = await client.getEntities('users', { age: 30 }) // params: entityName, filter

// Retrieve a single entity, will return null if not found
const singleEntity = await client.getEntity('users', id) // params: entityName, entityId

// Update an entity
const updatedEntityData = { name: 'Jane Doe', age: 31 };
const updatedEntity = await client.updateEntity('users', id, updatedEntityData) // params: entityName, entityId, entityData

// Delete an entity
await client.deleteEntity('users', id) // params: entityName, entityId
`
}