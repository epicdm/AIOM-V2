/**
 * Odoo XML-RPC Client
 *
 * Core client library for connecting to Odoo ERP via XML-RPC API.
 * Handles authentication, session management, and provides typed
 * interfaces for common operations.
 */

import { xmlRpcCall } from './xml-rpc';
import type {
  OdooConfig,
  OdooSession,
  OdooDomain,
  SearchReadOptions,
  ReadOptions,
  OdooRecord,
  XmlRpcValue,
} from './types';
import {
  OdooError,
  OdooAuthenticationError,
  OdooAccessError,
  OdooValidationError,
} from './types';

// =============================================================================
// Odoo Client Class
// =============================================================================

export class OdooClient {
  private config: OdooConfig;
  private session: OdooSession | null = null;

  // XML-RPC endpoints
  private readonly commonEndpoint: string;
  private readonly objectEndpoint: string;

  constructor(config: OdooConfig) {
    this.config = config;

    // Normalize URL (remove trailing slash)
    const baseUrl = config.url.replace(/\/+$/, '');
    this.commonEndpoint = `${baseUrl}/xmlrpc/2/common`;
    this.objectEndpoint = `${baseUrl}/xmlrpc/2/object`;
  }

  // ===========================================================================
  // Authentication & Session Management
  // ===========================================================================

  /**
   * Authenticates with the Odoo server and creates a session
   */
  async authenticate(): Promise<OdooSession> {
    try {
      const uid = await xmlRpcCall(this.commonEndpoint, 'authenticate', [
        this.config.database,
        this.config.username,
        this.config.password,
        {}, // User agent info (optional)
      ]);

      if (uid === false || uid === null || uid === 0) {
        throw new OdooAuthenticationError(
          'Invalid credentials or database not found'
        );
      }

      this.session = {
        uid: uid as number,
        database: this.config.database,
        url: this.config.url,
        username: this.config.username,
        password: this.config.password,
        createdAt: new Date(),
      };

      return this.session;
    } catch (error) {
      if (error instanceof OdooError) {
        throw error;
      }
      throw new OdooAuthenticationError(
        error instanceof Error ? error.message : 'Authentication failed'
      );
    }
  }

  /**
   * Checks if the client has an active session
   */
  isAuthenticated(): boolean {
    return this.session !== null;
  }

  /**
   * Returns the current session or null if not authenticated
   */
  getSession(): OdooSession | null {
    return this.session;
  }

  /**
   * Clears the current session
   */
  logout(): void {
    this.session = null;
  }

  /**
   * Gets server version information
   */
  async getVersion(): Promise<Record<string, XmlRpcValue>> {
    const result = await xmlRpcCall(this.commonEndpoint, 'version', []);
    return result as Record<string, XmlRpcValue>;
  }

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  /**
   * Ensures the client is authenticated before making API calls
   */
  private ensureAuthenticated(): OdooSession {
    if (!this.session) {
      throw new OdooAuthenticationError(
        'Not authenticated. Call authenticate() first.'
      );
    }
    return this.session;
  }

  /**
   * Makes an authenticated call to the object endpoint
   */
  private async execute<T = XmlRpcValue>(
    model: string,
    method: string,
    args: XmlRpcValue[],
    kwargs: Record<string, XmlRpcValue> = {}
  ): Promise<T> {
    const session = this.ensureAuthenticated();

    try {
      const result = await xmlRpcCall(this.objectEndpoint, 'execute_kw', [
        session.database,
        session.uid,
        session.password,
        model,
        method,
        args,
        kwargs,
      ]);

      return result as T;
    } catch (error) {
      if (error instanceof OdooError) {
        // Re-classify error based on message
        const message = error.message.toLowerCase();

        if (message.includes('access') || message.includes('permission')) {
          throw new OdooAccessError(error.message);
        }

        if (message.includes('validation') || message.includes('constraint')) {
          throw new OdooValidationError(error.message);
        }

        throw error;
      }

      throw new OdooError(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  /**
   * Searches for record IDs matching the domain
   */
  async search(
    model: string,
    domain: OdooDomain = [],
    options: Omit<SearchReadOptions, 'fields'> = {}
  ): Promise<number[]> {
    const kwargs: Record<string, XmlRpcValue> = {};

    if (options.offset !== undefined) kwargs.offset = options.offset;
    if (options.limit !== undefined) kwargs.limit = options.limit;
    if (options.order !== undefined) kwargs.order = options.order;

    return this.execute<number[]>(model, 'search', [domain], kwargs);
  }

  /**
   * Counts records matching the domain
   */
  async searchCount(model: string, domain: OdooDomain = []): Promise<number> {
    return this.execute<number>(model, 'search_count', [domain]);
  }

  /**
   * Reads records by their IDs
   */
  async read<T extends OdooRecord = OdooRecord>(
    model: string,
    ids: number[],
    options: ReadOptions = {}
  ): Promise<T[]> {
    const kwargs: Record<string, XmlRpcValue> = {};

    if (options.fields && options.fields.length > 0) {
      kwargs.fields = options.fields;
    }

    return this.execute<T[]>(model, 'read', [ids], kwargs);
  }

  /**
   * Searches and reads records in a single call (more efficient)
   */
  async searchRead<T extends OdooRecord = OdooRecord>(
    model: string,
    domain: OdooDomain = [],
    options: SearchReadOptions = {}
  ): Promise<T[]> {
    const kwargs: Record<string, XmlRpcValue> = {};

    if (options.fields && options.fields.length > 0) {
      kwargs.fields = options.fields;
    }
    if (options.offset !== undefined) kwargs.offset = options.offset;
    if (options.limit !== undefined) kwargs.limit = options.limit;
    if (options.order !== undefined) kwargs.order = options.order;

    return this.execute<T[]>(model, 'search_read', [domain], kwargs);
  }

  /**
   * Creates a new record
   */
  async create(
    model: string,
    values: Record<string, XmlRpcValue>
  ): Promise<number> {
    return this.execute<number>(model, 'create', [values]);
  }

  /**
   * Creates multiple records at once
   */
  async createMulti(
    model: string,
    valuesList: Record<string, XmlRpcValue>[]
  ): Promise<number[]> {
    return this.execute<number[]>(model, 'create', [valuesList]);
  }

  /**
   * Updates existing records
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, XmlRpcValue>
  ): Promise<boolean> {
    return this.execute<boolean>(model, 'write', [ids, values]);
  }

  /**
   * Deletes records
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.execute<boolean>(model, 'unlink', [ids]);
  }

  // ===========================================================================
  // Field & Model Introspection
  // ===========================================================================

  /**
   * Gets field definitions for a model
   */
  async fieldsGet(
    model: string,
    attributes: string[] = ['string', 'help', 'type', 'required', 'readonly']
  ): Promise<Record<string, Record<string, XmlRpcValue>>> {
    return this.execute<Record<string, Record<string, XmlRpcValue>>>(
      model,
      'fields_get',
      [],
      { attributes }
    );
  }

  /**
   * Checks if the current user has access rights to a model
   */
  async checkAccessRights(
    model: string,
    operation: 'read' | 'write' | 'create' | 'unlink',
    raiseException: boolean = false
  ): Promise<boolean> {
    return this.execute<boolean>(model, 'check_access_rights', [operation], {
      raise_exception: raiseException,
    });
  }

  // ===========================================================================
  // Advanced Operations
  // ===========================================================================

  /**
   * Calls a custom method on a model
   */
  async callMethod<T = XmlRpcValue>(
    model: string,
    method: string,
    args: XmlRpcValue[] = [],
    kwargs: Record<string, XmlRpcValue> = {}
  ): Promise<T> {
    return this.execute<T>(model, method, args, kwargs);
  }

  /**
   * Calls a method on specific record IDs
   */
  async callMethodOnIds<T = XmlRpcValue>(
    model: string,
    ids: number[],
    method: string,
    args: XmlRpcValue[] = [],
    kwargs: Record<string, XmlRpcValue> = {}
  ): Promise<T> {
    return this.execute<T>(model, method, [ids, ...args], kwargs);
  }

  /**
   * Gets the default values for creating a record
   */
  async defaultGet(
    model: string,
    fields: string[]
  ): Promise<Record<string, XmlRpcValue>> {
    return this.execute<Record<string, XmlRpcValue>>(
      model,
      'default_get',
      [fields]
    );
  }

  /**
   * Executes a name search (commonly used for autocomplete)
   */
  async nameSearch(
    model: string,
    name: string = '',
    domain: OdooDomain = [],
    operator: string = 'ilike',
    limit: number = 100
  ): Promise<Array<[number, string]>> {
    return this.execute<Array<[number, string]>>(model, 'name_search', [], {
      name,
      args: domain,
      operator,
      limit,
    });
  }

  /**
   * Gets the display name for records
   */
  async nameGet(model: string, ids: number[]): Promise<Array<[number, string]>> {
    return this.execute<Array<[number, string]>>(model, 'name_get', [ids]);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates and authenticates an Odoo client
 */
export async function createOdooClient(
  config: OdooConfig
): Promise<OdooClient> {
  const client = new OdooClient(config);
  await client.authenticate();
  return client;
}

/**
 * Creates an Odoo client without authenticating
 * (useful when you want to control when authentication happens)
 */
export function createOdooClientSync(config: OdooConfig): OdooClient {
  return new OdooClient(config);
}
