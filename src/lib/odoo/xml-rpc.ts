/**
 * XML-RPC Protocol Implementation
 *
 * This module provides a lightweight XML-RPC client implementation
 * for communicating with Odoo's XML-RPC API.
 */

import type { XmlRpcValue, XmlRpcFault } from './types';
import { OdooConnectionError, OdooError } from './types';

// =============================================================================
// XML-RPC Value Encoding
// =============================================================================

/**
 * Encodes a JavaScript value to XML-RPC format
 */
export function encodeValue(value: XmlRpcValue): string {
  if (value === null || value === undefined) {
    return '<value><nil/></value>';
  }

  if (typeof value === 'boolean') {
    return `<value><boolean>${value ? '1' : '0'}</boolean></value>`;
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `<value><int>${value}</int></value>`;
    }
    return `<value><double>${value}</double></value>`;
  }

  if (typeof value === 'string') {
    const escaped = escapeXml(value);
    return `<value><string>${escaped}</string></value>`;
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => encodeValue(item)).join('');
    return `<value><array><data>${items}</data></array></value>`;
  }

  if (typeof value === 'object') {
    const members = Object.entries(value)
      .map(([key, val]) => `<member><name>${escapeXml(key)}</name>${encodeValue(val)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }

  throw new Error(`Unsupported XML-RPC value type: ${typeof value}`);
}

/**
 * Escapes special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// =============================================================================
// XML-RPC Request Building
// =============================================================================

/**
 * Builds an XML-RPC method call request body
 */
export function buildMethodCall(methodName: string, params: XmlRpcValue[]): string {
  const encodedParams = params.map((param) => `<param>${encodeValue(param)}</param>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>${escapeXml(methodName)}</methodName>
  <params>${encodedParams}</params>
</methodCall>`;
}

// =============================================================================
// XML-RPC Response Parsing
// =============================================================================

/**
 * Finds matching closing tag, handling nested tags
 */
function findMatchingCloseTag(xml: string, tagName: string, startPos: number): number {
  let depth = 1;
  let pos = startPos;
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;

  while (depth > 0 && pos < xml.length) {
    const nextOpen = xml.indexOf(openTag, pos);
    const nextClose = xml.indexOf(closeTag, pos);

    if (nextClose === -1) {
      return -1; // No closing tag found
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Found another opening tag first
      depth++;
      pos = nextOpen + openTag.length;
    } else {
      // Found closing tag
      depth--;
      if (depth === 0) {
        return nextClose;
      }
      pos = nextClose + closeTag.length;
    }
  }

  return -1;
}

/**
 * Extracts content between opening and closing tags
 */
function extractTagContent(xml: string, tagName: string): string | null {
  const openTagStart = xml.indexOf(`<${tagName}`);
  if (openTagStart === -1) return null;

  // Find the end of the opening tag
  const openTagEnd = xml.indexOf('>', openTagStart);
  if (openTagEnd === -1) return null;

  // Check for self-closing tag
  if (xml[openTagEnd - 1] === '/') {
    return '';
  }

  const contentStart = openTagEnd + 1;
  const closeTagPos = findMatchingCloseTag(xml, tagName, contentStart);

  if (closeTagPos === -1) return null;

  return xml.substring(contentStart, closeTagPos);
}

/**
 * Parses an XML-RPC response and extracts the result value
 */
export function parseResponse(xml: string): XmlRpcValue {
  // Check for fault response
  const faultContent = extractTagContent(xml, 'fault');
  if (faultContent !== null) {
    const valueContent = extractTagContent(faultContent, 'value');
    if (valueContent) {
      const fault = parseValue(valueContent) as unknown as XmlRpcFault;
      throw new OdooError(
        fault.faultString || 'XML-RPC Fault',
        fault.faultCode
      );
    }
    throw new OdooError('XML-RPC Fault');
  }

  // Extract the response value
  const paramsContent = extractTagContent(xml, 'params');
  if (!paramsContent) {
    throw new OdooError('Invalid XML-RPC response: no params found');
  }

  const paramContent = extractTagContent(paramsContent, 'param');
  if (!paramContent) {
    throw new OdooError('Invalid XML-RPC response: no param found');
  }

  const valueContent = extractTagContent(paramContent, 'value');
  if (valueContent === null) {
    throw new OdooError('Invalid XML-RPC response: no value found');
  }

  return parseValue(valueContent);
}

/**
 * Checks if a tag exists at the root level (not nested inside another tag)
 */
function hasRootTag(xml: string, tagName: string): boolean {
  const tagStart = xml.indexOf(`<${tagName}`);
  if (tagStart === -1) return false;

  // Check that there's no other opening tag before this one
  // (ignoring whitespace and the XML declaration)
  const beforeTag = xml.substring(0, tagStart).trim();
  // If there's nothing before the tag, or only whitespace, it's at root level
  return beforeTag === '' || !beforeTag.includes('<') || beforeTag.startsWith('<?xml');
}

/**
 * Parses an XML-RPC value element
 */
function parseValue(xml: string): XmlRpcValue {
  // Remove leading/trailing whitespace
  xml = xml.trim();

  // Nil
  if (xml.includes('<nil') || xml === '') {
    return null;
  }

  // Check for complex types first (they contain nested elements)
  // Array - check at root level
  if (hasRootTag(xml, 'array')) {
    const arrayContent = extractTagContent(xml, 'array');
    if (arrayContent !== null) {
      const dataContent = extractTagContent(arrayContent, 'data');
      if (dataContent !== null) {
        return parseArray(dataContent);
      }
      return [];
    }
  }

  // Struct - check at root level
  if (hasRootTag(xml, 'struct')) {
    const structContent = extractTagContent(xml, 'struct');
    if (structContent !== null) {
      return parseStruct(structContent);
    }
  }

  // Boolean
  const boolContent = extractTagContent(xml, 'boolean');
  if (boolContent !== null) {
    return boolContent.trim() === '1';
  }

  // Integer types (int, i4, i8)
  for (const intTag of ['int', 'i4', 'i8']) {
    const intContent = extractTagContent(xml, intTag);
    if (intContent !== null) {
      return parseInt(intContent.trim(), 10);
    }
  }

  // Double
  const doubleContent = extractTagContent(xml, 'double');
  if (doubleContent !== null) {
    return parseFloat(doubleContent.trim());
  }

  // String (explicit tag)
  const stringContent = extractTagContent(xml, 'string');
  if (stringContent !== null) {
    return unescapeXml(stringContent);
  }

  // Base64
  const base64Content = extractTagContent(xml, 'base64');
  if (base64Content !== null) {
    return base64Content.trim();
  }

  // DateTime
  const dateContent = extractTagContent(xml, 'dateTime.iso8601');
  if (dateContent !== null) {
    return dateContent.trim();
  }

  // If no type tag, treat as string (XML-RPC spec default)
  return unescapeXml(xml);
}

/**
 * Parses an XML-RPC array (content of <data> element)
 */
function parseArray(dataContent: string): XmlRpcValue[] {
  const values: XmlRpcValue[] = [];
  let pos = 0;

  while (pos < dataContent.length) {
    const valueStart = dataContent.indexOf('<value>', pos);
    if (valueStart === -1) break;

    const contentStart = valueStart + 7; // length of '<value>'
    const valueEnd = findMatchingCloseTag(dataContent, 'value', contentStart);

    if (valueEnd === -1) break;

    const content = dataContent.substring(contentStart, valueEnd);
    values.push(parseValue(content));

    pos = valueEnd + 8; // length of '</value>'
  }

  return values;
}

/**
 * Parses an XML-RPC struct
 */
function parseStruct(structContent: string): Record<string, XmlRpcValue> {
  const result: Record<string, XmlRpcValue> = {};
  let pos = 0;

  while (pos < structContent.length) {
    const memberStart = structContent.indexOf('<member>', pos);
    if (memberStart === -1) break;

    const memberContentStart = memberStart + 8; // length of '<member>'
    const memberEnd = findMatchingCloseTag(structContent, 'member', memberContentStart);

    if (memberEnd === -1) break;

    const memberContent = structContent.substring(memberContentStart, memberEnd);

    // Extract name
    const nameContent = extractTagContent(memberContent, 'name');
    if (nameContent === null) {
      pos = memberEnd + 9; // length of '</member>'
      continue;
    }

    // Extract value
    const valueContent = extractTagContent(memberContent, 'value');
    if (valueContent === null) {
      pos = memberEnd + 9;
      continue;
    }

    const name = unescapeXml(nameContent.trim());
    result[name] = parseValue(valueContent);

    pos = memberEnd + 9; // length of '</member>'
  }

  return result;
}

/**
 * Unescapes XML entities
 */
function unescapeXml(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// =============================================================================
// XML-RPC HTTP Client
// =============================================================================

/**
 * Makes an XML-RPC call to the specified endpoint
 */
export async function xmlRpcCall(
  url: string,
  methodName: string,
  params: XmlRpcValue[]
): Promise<XmlRpcValue> {
  const body = buildMethodCall(methodName, params);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        Accept: 'text/xml',
      },
      body,
    });

    if (!response.ok) {
      throw new OdooConnectionError(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const responseText = await response.text();
    return parseResponse(responseText);
  } catch (error) {
    if (error instanceof OdooError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OdooConnectionError(
        `Network error: Unable to connect to ${url}`
      );
    }

    throw new OdooConnectionError(
      error instanceof Error ? error.message : 'Unknown connection error'
    );
  }
}
