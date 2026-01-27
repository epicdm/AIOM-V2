/**
 * Odoo JSON-2 External API Client (Odoo 19+)
 *
 * Official external API for Odoo 19+
 * Uses API key authentication with Bearer tokens
 *
 * Reference: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
 */

import type { OdooDomain, OdooRecord } from './types';

export interface JSON2Config {
  url: string;
  database: string;
  apiKey: string; // User's API key
}

export interface JSON2CallOptions {
  args?: any[];
  kwargs?: Record<string, any>;
  context?: Record<string, any>;
}

export interface JSON2SearchReadOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string;
  context?: Record<string, any>;
}

/**
 * Odoo JSON-2 External API Client
 *
 * Modern API client for Odoo 19+ using Bearer token authentication
 */
export class OdooJSON2Client {
  private config: JSON2Config;
  private baseUrl: string;

  constructor(config: JSON2Config) {
    this.config = config;
    // Normalize URL (remove trailing slash)
    this.baseUrl = config.url.replace(/\/+$/, '');
  }

  /**
   * Makes an authenticated API call
   */
  private async call<T = any>(
    endpoint: string,
    body: any,
    debug = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    // Add database header if needed (for multi-database instances)
    if (this.config.database) {
      headers['X-Odoo-Database'] = this.config.database;
    }

    if (debug) {
      console.log('[JSON-2 Request]');
      console.log('  URL:', url);
      console.log('  Headers:', headers);
      console.log('  Body:', JSON.stringify(body, null, 2));
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (debug) {
        console.log('[JSON-2 Response]');
        console.log('  Status:', response.status);
        console.log('  Status Text:', response.statusText);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (debug) {
          console.log('  Error Body:', errorText);
        }
        throw new Error(
          `Odoo API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();

      if (debug) {
        console.log('  Data:', JSON.stringify(data, null, 2));
      }

      // Check for Odoo error in response
      if (data.error) {
        throw new Error(
          `Odoo error: ${data.error.message || JSON.stringify(data.error)}`
        );
      }

      // Odoo JSON-2 API returns the value directly, not wrapped in {result: ...}
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error: ${String(error)}`);
    }
  }

  /**
   * Search for record IDs matching the domain
   */
  async search(
    model: string,
    domain: OdooDomain = [],
    options: { limit?: number; offset?: number; order?: string; context?: Record<string, any> } = {}
  ): Promise<number[]> {
    const endpoint = `/json/2/${model}/search`;

    const body: any = {
      domain,
    };

    if (options.limit !== undefined) body.limit = options.limit;
    if (options.offset !== undefined) body.offset = options.offset;
    if (options.order) body.order = options.order;
    if (options.context) body.context = options.context;

    return this.call<number[]>(endpoint, body);
  }

  /**
   * Count records matching the domain
   */
  async searchCount(
    model: string,
    domain: OdooDomain = [],
    debug = false
  ): Promise<number> {
    const endpoint = `/json/2/${model}/search_count`;

    return this.call<number>(endpoint, { domain }, debug);
  }

  /**
   * Read records by IDs
   */
  async read<T extends OdooRecord = OdooRecord>(
    model: string,
    ids: number[],
    options: { fields?: string[]; context?: Record<string, any> } = {}
  ): Promise<T[]> {
    const endpoint = `/json/2/${model}/read`;

    const body: any = {
      ids,
    };

    if (options.fields && options.fields.length > 0) {
      body.fields = options.fields;
    }
    if (options.context) {
      body.context = options.context;
    }

    return this.call<T[]>(endpoint, body);
  }

  /**
   * Search and read records in a single call
   */
  async searchRead<T extends OdooRecord = OdooRecord>(
    model: string,
    domain: OdooDomain = [],
    options: JSON2SearchReadOptions = {}
  ): Promise<T[]> {
    const endpoint = `/json/2/${model}/search_read`;

    const body: any = {
      domain,
    };

    if (options.fields && options.fields.length > 0) {
      body.fields = options.fields;
    }
    if (options.limit !== undefined) body.limit = options.limit;
    if (options.offset !== undefined) body.offset = options.offset;
    if (options.order) body.order = options.order;
    if (options.context) body.context = options.context;

    return this.call<T[]>(endpoint, body);
  }

  /**
   * Create a new record
   */
  async create(
    model: string,
    values: Record<string, any>,
    context?: Record<string, any>
  ): Promise<number> {
    const endpoint = `/json/2/${model}/create`;

    const body: any = {
      values,
    };

    if (context) {
      body.context = context;
    }

    return this.call<number>(endpoint, body);
  }

  /**
   * Create multiple records
   */
  async createMulti(
    model: string,
    valuesList: Record<string, any>[],
    context?: Record<string, any>
  ): Promise<number[]> {
    const endpoint = `/json/2/${model}/create`;

    const body: any = {
      values: valuesList,
    };

    if (context) {
      body.context = context;
    }

    return this.call<number[]>(endpoint, body);
  }

  /**
   * Update existing records
   */
  async write(
    model: string,
    ids: number[],
    values: Record<string, any>,
    context?: Record<string, any>
  ): Promise<boolean> {
    const endpoint = `/json/2/${model}/write`;

    const body: any = {
      ids,
      values,
    };

    if (context) {
      body.context = context;
    }

    return this.call<boolean>(endpoint, body);
  }

  /**
   * Delete records
   */
  async unlink(
    model: string,
    ids: number[],
    context?: Record<string, any>
  ): Promise<boolean> {
    const endpoint = `/json/2/${model}/unlink`;

    const body: any = {
      ids,
    };

    if (context) {
      body.context = context;
    }

    return this.call<boolean>(endpoint, body);
  }

  /**
   * Call any arbitrary model method
   */
  async callMethod<T = any>(
    model: string,
    method: string,
    options: JSON2CallOptions = {}
  ): Promise<T> {
    const endpoint = `/json/2/${model}/${method}`;

    const body: any = {};

    if (options.args && options.args.length > 0) {
      body.args = options.args;
    }
    if (options.kwargs && Object.keys(options.kwargs).length > 0) {
      body.kwargs = options.kwargs;
    }
    if (options.context) {
      body.context = options.context;
    }

    return this.call<T>(endpoint, body);
  }

  /**
   * Get field definitions for a model
   */
  async fieldsGet(
    model: string,
    fields?: string[],
    attributes: string[] = ['string', 'help', 'type', 'required', 'readonly']
  ): Promise<Record<string, Record<string, any>>> {
    return this.callMethod(model, 'fields_get', {
      args: fields ? [fields] : [],
      kwargs: { attributes },
    });
  }

  /**
   * Call a button/action method on specific record IDs
   */
  async callMethodOnIds<T = any>(
    model: string,
    ids: number[],
    method: string,
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    const endpoint = `/json/2/${model}/${method}`;

    const body: any = {
      ids,
    };

    if (args.length > 0) body.args = args;
    if (Object.keys(kwargs).length > 0) body.kwargs = kwargs;

    return this.call<T>(endpoint, body);
  }

  /**
   * Get Odoo server version info (if available)
   */
  async version(debug = false): Promise<Record<string, any>> {
    // Note: version endpoint might not be available on all instances
    const endpoint = '/json/2/version';
    return this.call(endpoint, {}, debug);
  }

  /**
   * Test if the API key and connection work
   */
  async testConnection(debug = false): Promise<boolean> {
    try {
      // Try a simple search_count on res.partner (most basic test)
      await this.searchCount('res.partner', [], debug);
      return true;
    } catch (error) {
      if (debug) {
        console.error('[Test Connection Failed]', error);
      }
      return false;
    }
  }
}

/**
 * Creates a new Odoo JSON-2 client instance
 */
export function createOdooJSON2Client(config: JSON2Config): OdooJSON2Client {
  return new OdooJSON2Client(config);
}
