import { TarobasePolicy } from '../types';

// DeploymentConfig interface defines the structure of the parsed configuration
export interface DeploymentConfig {
  entities: Record<string, EntityDefinition>;
  rules: Record<string, RuleDefinition>;
  hooks: Record<string, HookDefinition>;
  functions?: Record<string, Function>;
}

// Entity definition with name, fields, and onchain flag
export interface EntityDefinition {
  name: string;
  path: string;
  fields: Record<string, string>;
  onchain: boolean;
  wildcards?: string[];
}

// Rule definition for various operations
export interface RuleDefinition {
  read?: string;
  write?: string;
  create?: string;
  update?: string;
  delete?: string;
}

// Hook definition for various operations
export interface HookDefinition {
  onchain?: {
    create?: string;
    update?: string;
    delete?: string;
  };
}

/**
 * Schema parser to convert Tarobase policy JSON into a deployment configuration
 */
export class SchemaParser {
  /**
   * Parse a Tarobase policy schema into a deployment configuration
   */
  parseSchema(schemaJson: any): DeploymentConfig {
    const config: DeploymentConfig = {
      entities: {},
      rules: {},
      hooks: {},
      functions: {}
    };
  
    // Process each entity definition
    for (const [path, entityDef] of Object.entries(schemaJson)) {
      // Skip functions section which is handled separately
      if (path === 'functions') {
        config.functions = this.parseFunctions(entityDef as Record<string, string>);
        continue;
      }
      
      // Parse entity definition
      const entity = this.parseEntityDefinition(path, entityDef as any);
      config.entities[entity.name] = entity;
    
      // Parse rules if they exist
      if (entityDef && (entityDef as any).rules) {
        config.rules[entity.name] = this.parseRules((entityDef as any).rules);
      }
    
      // Parse hooks if they exist
      if (entityDef && (entityDef as any).hooks) {
        config.hooks[entity.name] = this.parseHooks((entityDef as any).hooks);
      }
    }
  
    return config;
  }

  /**
   * Parse entity definition from schema
   */
  private parseEntityDefinition(path: string, entityDef: any): EntityDefinition {
    // Extract wildcards from path (e.g., "post/$postId" => ["postId"])
    const wildcards: string[] = [];
    const pathParts = path.split('/');
    
    // The entity name is the first part of the path
    let name = pathParts[0];
    
    // Extract wildcards from path segments
    pathParts.forEach(part => {
      if (part.startsWith('$')) {
        wildcards.push(part.substring(1));
      }
    });

    return {
      name,
      path,
      fields: entityDef.fields || {},
      onchain: entityDef.onchain || false,
      wildcards: wildcards.length > 0 ? wildcards : undefined
    };
  }

  /**
   * Parse rules from entity definition
   */
  private parseRules(rules: any): RuleDefinition {
    return {
      read: rules.read,
      write: rules.write,
      create: rules.create,
      update: rules.update,
      delete: rules.delete
    };
  }

  /**
   * Parse hooks from entity definition
   */
  private parseHooks(hooks: any): HookDefinition {
    const result: HookDefinition = {};
    
    if (hooks.onchain) {
      result.onchain = {
        create: hooks.onchain.create,
        update: hooks.onchain.update,
        delete: hooks.onchain.delete
      };
    }
    
    return result;
  }

  /**
   * Parse custom functions from the schema
   */
  private parseFunctions(funcs: Record<string, string>): Record<string, Function> {
    const result: Record<string, Function> = {};
    
    for (const [name, funcDef] of Object.entries(funcs)) {
      // Basic parsing of function definition
      // In a real implementation, this would need more sophisticated parsing and sandboxing
      try {
        // Extract function body and parameters
        const funcMatch = funcDef.match(/function\s*\((.*?)\)\s*\{([\s\S]*)\}/);
        if (funcMatch) {
          const [, params, body] = funcMatch;
          
          // Create the function (using Function constructor - note: this has security implications)
          // In production, we would want a safer evaluation method
          result[name] = new Function(...params.split(',').map(p => p.trim()), body);
        }
      } catch (error) {
        console.error(`Error parsing function ${name}:`, error);
      }
    }
    
    return result;
  }
} 