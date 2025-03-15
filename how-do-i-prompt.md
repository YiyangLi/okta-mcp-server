# Building the Okta MCP Server: A Step-by-Step Guide

> "The greatest gift you can give someone is the power to be successful." -- Ray Dalio

This guide demonstrates how I built the Okta MCP Server using Cursor with Claude-3.5-sonnet. While I assume you have basic knowledge of Node.js/TypeScript and know [how to generate an MCP server](https://github.com/modelcontextprotocol/create-typescript-server), I'll focus on the prompting techniques with Cursor. Feel free to replicate these prompts to see the results for yourself.

## Step 1: Implementing Basic API Calls

First, I provided Cursor with essential context. Following [the documentation](https://modelcontextprotocol.io/tutorials/building-mcp-with-llms), I included two key files:
- [llm-full.txt](./assets/llm-full.txt)
- [mcp-typescript-sdk readme](./assets/mcp-typescript-sdk-readme.md)

### Initial Prompt
```
I have index.ts, which is a sample of an MCP server. You need to understand the sample, remove the examples, and build an okta MCP server.

- This is the open api 3 documentation from okta: @https://raw.githubusercontent.com/okta/okta-management-openapi-spec/refs/heads/master/dist/current/management-minimal.yaml  you may firstly process the doc. To simplify it, you only need to process 3 API paths, `api/v1/apps`, `api/v1/users`, and `api/v1/groups`, and the http method is GET. 
- For each api, there is a api_prefix, it would be okta_${operationId}, the operationId is a pascalCase, you may convert it to snake_case. Having the api_prefix, you need to write 1 tool for each api. `{api_prefix}_make_request`. 
- The tool will call okta public api with a token and restrieve the resources. 
- The MCP server takes 2 environment variables, OKTA_DOMAIN, API_TOKEN. You have to use npm package, @okta/okta-sdk-nodejs, to make the api call. 
```

### Result
The prompt generated code in index.ts with three [tools](https://modelcontextprotocol.io/docs/concepts/tools). I made some improvements:
1. Added a helper function to handle unknown error types
2. Simplified the catch blocks in all three tools
3. Added a helper function to extract primitive properties from API responses (the list-applications API was returning too much data)

After building with `npm run build`, I configured Claude Desktop and tested it with my Okta organization. (Fortunately, I still had access to my Okta account through Okta Verify on my iPhone 12 mini for MFA!)

## Step 2: Expanding Tool Coverage

Rather than manually parsing the SDK documentation, I leveraged the examples in the [Okta Node.js SDK README](https://github.com/okta/okta-sdk-nodejs?tab=readme-ov-file#examples). 

### Prompt
```
I want you to add more tools to index.ts. Please read the okta-nodejs-sdk.md, there is an example section. Under the example section, there are 3 sub-sections, Users, Groups and Applications, we've implemented "list all org users". I need your help to implement other APIs in these 3 sub-sections. 

please also follow the naming pattern for each tool, `{api_prefix}_make_request`. 
```

## Step 3: Refining Application APIs

As someone focused on OIN, I wanted to spend more time on the application-related tools.

### Prompt
```
okta_create_application_make_request is too complicated. It's better to process the metadata so we know the required fields of each app. So please delete the tool. 

Add another tool for deleting an application and deactivating an application.
```

## Step 4: Final Polish

The last step involved organizing the code and improving documentation.

### Prompt
```
I want you to rearrange tools, for the first 3 tools that list resources, please move it to the corresponding section, users, groups or applications. 

Lastly, I want you to update the readme.md to reflect the available tools. 

You may follow this one as an example, @https://raw.githubusercontent.com/modelcontextprotocol/servers/refs/heads/main/src/slack/README.md  
```

