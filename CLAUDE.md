# D-media n8n Workflow Builder

This workspace is for building production-quality n8n workflows using Claude with n8n-mcp tools and n8n skills. Workflows include both traditional automations/integrations and AI agent workflows.

## Available Tools

- **n8n MCP Server**: Node discovery, documentation, configuration, validation, and workflow management for n8n's 1,000+ nodes
- **n8n Skills** (slash commands): 7 specialized skills that activate contextually — see Skill Reference below

## Safety Rules

- NEVER edit production workflows directly. Always copy first.
- NEVER deploy unvalidated workflows.
- NEVER hardcode credentials or secrets into workflow JSON. Use n8n credential references.
- NEVER skip the Research phase. Always look up node properties via MCP tools before configuring.
- ALWAYS validate workflows before activating them.
- ALWAYS test with sample data before deploying to production.

## Workflow Building Process

Follow this sequence for every workflow request. Do not jump straight to building.

### Phase 1: Gather Requirements

- Clarify the trigger type (webhook, schedule, manual, app event)
- Identify all data sources and destinations
- Determine error handling needs (retry, fallback, notification)
- Ask: is this a traditional automation or an AI agent workflow?
- Confirm expected data volume and execution frequency

### Phase 2: Research & Design

- Invoke `/n8n-workflow-patterns` to identify the matching architectural pattern
- Use MCP tool `search_nodes` to find correct node types for each step
- Use MCP tool `get_node_essentials` to retrieve required properties for each node
- Use MCP tool `list_nodes` by category if search is too broad
- Map out the node chain: trigger → processing → output
- For AI agent workflows: identify agent node, tool nodes, memory nodes, and output parser nodes

### Phase 3: Build

- Create workflow JSON using validated node configurations
- Invoke `/n8n-node-configuration` for each node to get operation-specific required fields and property dependencies
- Use `/n8n-expression-syntax` when writing expressions in node parameters
- Use `/n8n-code-javascript` or `/n8n-code-python` when writing Code node logic
- Use MCP tool `create_workflow` or `update_partial_workflow` to push to n8n instance
- Wire connections correctly: source node output → destination node input, matching `main` type and `index`

### Phase 4: Validate

- Run MCP validation tools at appropriate profile levels:
  - `minimal` during drafting (catches structural errors)
  - `runtime` before deployment (catches execution errors)
  - `strict` for production-ready workflows
  - `ai-friendly` for AI agent workflows
- Invoke `/n8n-validation-expert` to interpret any validation errors
- Fix issues and re-validate until clean

### Phase 5: Test & Deploy

- Execute workflow via MCP tools or manual trigger
- Verify output data structure matches expectations
- Check error handling paths with intentional bad input
- Activate workflow only after successful test execution

## Skill Reference

Invoke skills using slash commands. Use `/n8n-mcp-tools-expert` first when unsure which tool to use.

| Skill | Command | When to Use |
|-------|---------|-------------|
| MCP Tools Expert | `/n8n-mcp-tools-expert` | First skill to consult. Guides correct MCP tool usage, nodeType formats, validation profiles, auto-sanitization. |
| Workflow Patterns | `/n8n-workflow-patterns` | Phase 2. Identifies which proven pattern applies: webhook processing, HTTP API, database ops, AI agents, scheduled tasks. |
| Node Configuration | `/n8n-node-configuration` | Phase 3. Provides operation-aware required fields, property dependency chains (e.g., `sendBody` requires `contentType`). |
| Expression Syntax | `/n8n-expression-syntax` | Phase 3. Validates `{{ }}` expressions using `$json`, `$node`, `$now`, `$env`. Webhook data is at `$json.body`, not `$json`. |
| Code JavaScript | `/n8n-code-javascript` | Phase 3. Covers `$input.all()`, `$input.first()`, `$input.item`, return format `[{json: {...}}]`, `$helpers` for HTTP. |
| Code Python | `/n8n-code-python` | Phase 3. Only when JavaScript cannot solve the problem. Python in n8n has no external libraries. Use JS for 95% of cases. |
| Validation Expert | `/n8n-validation-expert` | Phase 4. Interprets validation errors, identifies false positives, recommends fixes, guides profile selection. |

## MCP Tool Usage Patterns

### Node Discovery

```
search_nodes({query: "slack"})           // Find nodes by keyword
list_nodes({category: "trigger"})        // Browse by category
get_node_essentials(nodeType)            // Get key properties (10-20 most important)
```

### Validation

```
validate_node_minimal()                  // Structural check during drafting
validate_node_operation()                // Operation-level check
validate_workflow()                      // Full workflow validation
validate_workflow_connections()          // Connection integrity
validate_workflow_expressions()          // Expression syntax correctness
```

### Workflow Management

```
create_workflow()                        // Create new workflow on n8n instance
update_partial_workflow()                // Update specific parts (preferred for modifications)
```

### nodeType Format

MCP tools and workflow JSON both use: `n8n-nodes-base.slack`
Always verify with `/n8n-mcp-tools-expert` if unsure about the format for a specific node.

## Workflow JSON Structure

Every n8n workflow JSON contains:

1. **nodes[]** — Array of node objects with `type`, `parameters`, `position`, `name`, `credentials`
2. **connections{}** — Object mapping source node outputs to destination node inputs
3. **settings** — Workflow execution settings
4. **meta** — Name, description, tags

### Connection Format

```json
{
  "connections": {
    "SourceNodeName": {
      "main": [[{"node": "DestNodeName", "type": "main", "index": 0}]]
    }
  }
}
```

### AI Agent Workflow Connections

AI agent workflows use additional connection types beyond `main`:
- `ai_agent` — connects to agent node
- `ai_tool` — connects tool nodes to agent
- `ai_memory` — connects memory nodes
- `ai_outputParser` — connects output parsers

### Data Format Between Nodes

All data passed between nodes is `Array<{json: object}>`. Code nodes must return this format:

```javascript
return [{json: {key: "value"}}];
```

## Quality Standards

### Structural

- All nodes have unique, descriptive names (not "HTTP Request" but "Fetch User Profile")
- All connections are wired correctly with proper type and index
- Credential references use IDs, never inline secrets
- Node positions are laid out left-to-right with consistent spacing

### Functional

- Trigger node is appropriate for the use case
- Error handling exists: at minimum, an Error Trigger workflow or try/catch in Code nodes
- Data transformations preserve required fields downstream
- Expressions reference valid paths (validate with MCP tools)

### AI Agent Workflows (additional)

- Agent node has system message configured
- Tool nodes are connected via `ai_tool` connection type
- Memory node is connected if conversation context is needed
- Output parser is configured if structured output is required
- Model parameters (temperature, max tokens) are set appropriately

### Production Readiness

- Passes `strict` validation profile
- Workflow has a description explaining its purpose
- Retry logic is configured for external API calls
- Timeout settings are appropriate for expected execution time

## Common Patterns

### Webhook → Process → Respond
**Trigger:** Webhook node | **Process:** Code/Set/IF nodes | **End:** Respond to Webhook node
Use when: External service sends data and expects a response

### Schedule → Fetch → Store
**Trigger:** Schedule Trigger | **Fetch:** HTTP Request | **Store:** Database/Spreadsheet node
Use when: Periodic data collection or sync

### App Event → Transform → Multi-Destination
**Trigger:** App trigger (Gmail, Slack, etc.) | **Transform:** Set/Code nodes | **Output:** Multiple branches
Use when: Reacting to events in one app and updating multiple systems

### AI Agent
**Trigger:** Webhook/Chat | **Agent:** AI Agent node | **Tools:** HTTP/Code/n8n tool nodes | **Memory:** Window Buffer
Use when: Conversational AI that takes actions, answers questions, or processes unstructured input

### Error Handler
**Trigger:** Error Trigger node | **Process:** Extract error details | **Notify:** Slack/Email/Webhook
Use when: Every production workflow should have a companion error handler

## Critical Reminders

1. **Webhook data location**: Access webhook payload at `$json.body`, not `$json` — this is the #1 expression mistake
2. **Python is last resort**: Use JavaScript for Code nodes unless there is a specific reason Python is required
3. **Validate early and often**: Run `minimal` validation after every few nodes, not just at the end
4. **Property dependencies matter**: Setting `sendBody: true` requires also setting `contentType` — check `/n8n-node-configuration`
5. **Return format in Code nodes**: Always `[{json: {...}}]` — forgetting the array wrapper or `json` key breaks downstream nodes
6. **AI connections are typed**: Agent workflows use `ai_tool`, `ai_memory`, `ai_outputParser` — not `main`
7. **Ask before assuming**: If the user's requirements are ambiguous, ask clarifying questions before building
