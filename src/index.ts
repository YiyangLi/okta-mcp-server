#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Okta from "@okta/okta-sdk-nodejs";

// Helper function to handle errors
function handleError(error: unknown, operation: string): never {
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to ${operation}: ${errorMessage}`);
}

// Helper function to extract primitive values
function extractPrimitives(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item !== 'object' || item === null ? item : extractPrimitives(item)
    ).filter(item => item !== undefined);
  }

  // Handle objects
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value !== 'object') {
      result[key] = value;
    } else if (Array.isArray(value) && value.every(item => typeof item !== 'object' || item === null)) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// Validate required environment variables
const OKTA_DOMAIN = process.env.OKTA_DOMAIN;
const API_TOKEN = process.env.API_TOKEN;

if (!OKTA_DOMAIN || !API_TOKEN) {
  throw new Error("Required environment variables OKTA_DOMAIN and API_TOKEN must be set");
}

// Initialize Okta client
const oktaClient = new Okta.Client({
  orgUrl: `https://${OKTA_DOMAIN}`,
  token: API_TOKEN,
});

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new McpServer({
  name: "Okta API Server",
  version: "1.0.0",
  description: "MCP Server for accessing Okta APIs"
});

// === USER TOOLS ===

// List Users
server.tool(
  "okta_list_users_make_request",
  {
    limit: z.number().optional().describe("Number of results to return (default 20)"),
    query: z.string().optional().describe("search a user by firstName, lastName, or email.")
  },
  async ({ limit, query }) => {
    try {
      const queryParams: any = {};
      if (limit) queryParams.limit = limit;
      if (query) queryParams.q = query;
      
      const users = await oktaClient.userApi.listUsers(queryParams);
      const data = [];
      for await (const user of users) {
        const simplified = extractPrimitives(user);
        if (simplified) {
          data.push(simplified);
        }
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      handleError(error, "list users");
    }
  }
);

// Create User
server.tool(
  "okta_create_user_make_request",
  {
    profile: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      login: z.string().email()
    }),
    credentials: z.object({
      password: z.object({
        value: z.string()
      }).optional()
    }).optional()
  },
  async ({ profile, credentials }) => {
    try {
      const user = await oktaClient.userApi.createUser({
        body: { profile, credentials }
      });
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }]
      };
    } catch (error) {
      handleError(error, "create user");
    }
  }
);

// Get User
server.tool(
  "okta_get_user_make_request",
  {
    userId: z.string().describe("User ID or login")
  },
  async ({ userId }) => {
    try {
      const user = await oktaClient.userApi.getUser({ userId });
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }]
      };
    } catch (error) {
      handleError(error, "get user");
    }
  }
);

// Update User
server.tool(
  "okta_update_user_make_request",
  {
    userId: z.string(),
    profile: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      login: z.string().email().optional()
    })
  },
  async ({ userId, profile }) => {
    try {
      const user = await oktaClient.userApi.updateUser({
        userId,
        user: { profile }
      });
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }]
      };
    } catch (error) {
      handleError(error, "update user");
    }
  }
);

// Delete User
server.tool(
  "okta_delete_user_make_request",
  {
    userId: z.string()
  },
  async ({ userId }) => {
    try {
      // First deactivate
      await oktaClient.userApi.deactivateUser({ userId });
      // Then delete
      await oktaClient.userApi.deleteUser({ userId });
      return {
        content: [{ type: "text", text: `User ${userId} has been deactivated and deleted` }]
      };
    } catch (error) {
      handleError(error, "delete user");
    }
  }
);

// === GROUP TOOLS ===

// List Groups
server.tool(
  "okta_list_groups_make_request",
  {
    limit: z.number().optional().describe("Number of results to return (default 20)"),
    search: z.string().optional().describe("Search expression for groups")
  },
  async ({ limit, search }) => {
    try {
      const queryParams: any = {};
      if (limit) queryParams.limit = limit;
      if (search) queryParams.search = search;
      
      const groups = await oktaClient.groupApi.listGroups(queryParams);
      const data = [];
      for await (const group of groups) {
        const simplified = extractPrimitives(group);
        if (simplified) {
          data.push(simplified);
        }
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      handleError(error, "list groups");
    }
  }
);

// Create Group
server.tool(
  "okta_create_group_make_request",
  {
    profile: z.object({
      name: z.string().describe("Name of the group"),
      description: z.string().optional()
    })
  },
  async ({ profile }) => {
    try {
      const group = await oktaClient.groupApi.createGroup({
        group: { profile }
      });
      return {
        content: [{ type: "text", text: JSON.stringify(group, null, 2) }]
      };
    } catch (error) {
      handleError(error, "create group");
    }
  }
);

// Assign User to Group
server.tool(
  "okta_assign_user_to_group_make_request",
  {
    groupId: z.string(),
    userId: z.string()
  },
  async ({ groupId, userId }) => {
    try {
      await oktaClient.groupApi.assignUserToGroup({ groupId, userId });
      return {
        content: [{ type: "text", text: `User ${userId} has been assigned to group ${groupId}` }]
      };
    } catch (error) {
      handleError(error, "assign user to group");
    }
  }
);

// === APPLICATION TOOLS ===

// List Applications
server.tool(
  "okta_list_applications_make_request",
  {
    limit: z.number().optional().describe("Number of results to return (default 20)"),
    query: z.string().optional().describe("Searches for apps with name or label properties")
  },
  async ({ limit, query }) => {
    try {
      const queryParams: any = {};
      if (limit) queryParams.limit = limit;
      if (query) queryParams.q = query;
      
      const applications = await oktaClient.applicationApi.listApplications(queryParams);
      const data = [];
      for await (const app of applications) {
        const simplified = extractPrimitives(app);
        if (simplified) {
          data.push(simplified);
        }
      }
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    } catch (error) {
      handleError(error, "list applications");
    }
  }
);

// Assign User to Application
server.tool(
  "okta_assign_user_to_application_make_request",
  {
    appId: z.string(),
    userId: z.string(),
    profile: z.record(z.any()).optional()
  },
  async ({ appId, userId, profile }) => {
    try {
      const appUser = await oktaClient.applicationApi.assignUserToApplication({
        appId,
        appUser: {
          id: userId,
          profile
        }
      });
      return {
        content: [{ type: "text", text: JSON.stringify(appUser, null, 2) }]
      };
    } catch (error) {
      handleError(error, "assign user to application");
    }
  }
);

// Assign Group to Application
server.tool(
  "okta_assign_group_to_application_make_request",
  {
    appId: z.string(),
    groupId: z.string()
  },
  async ({ appId, groupId }) => {
    try {
      const assignment = await oktaClient.applicationApi.assignGroupToApplication({
        appId,
        groupId,
        applicationGroupAssignment: {}
      });
      return {
        content: [{ type: "text", text: JSON.stringify(assignment, null, 2) }]
      };
    } catch (error) {
      handleError(error, "assign group to application");
    }
  }
);

// Delete Application
server.tool(
  "okta_delete_application_make_request",
  {
    appId: z.string().describe("ID of the application to delete")
  },
  async ({ appId }) => {
    try {
      await oktaClient.applicationApi.deleteApplication({ appId });
      return {
        content: [{ type: "text", text: `Application ${appId} has been deleted` }]
      };
    } catch (error) {
      handleError(error, "delete application");
    }
  }
);

// Deactivate Application
server.tool(
  "okta_deactivate_application_make_request",
  {
    appId: z.string().describe("ID of the application to deactivate")
  },
  async ({ appId }) => {
    try {
      await oktaClient.applicationApi.deactivateApplication({ appId });
      return {
        content: [{ type: "text", text: `Application ${appId} has been deactivated` }]
      };
    } catch (error) {
      handleError(error, "deactivate application");
    }
  }
);

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
