## Claude Chats

- mcp - https://claude.ai/chat/8f04fbd3-177a-4183-bfb3-2e7839a95e7e
- comms and clud services questions - https://claude.ai/chat/4314f209-8d34-42a4-90d4-e3ef19b7ceb8
- file uploads, csv, esm, fetch, env - https://claude.ai/chat/4314f209-8d34-42a4-90d4-e3ef19b7ceb8
- github actions, monorepo, commonjs or modeuls - https://claude.ai/chat/74af690f-45ab-44ff-b0f8-b60b0d21874d


## VS Code

Install Copilot API Docs Generator skill

https://github.com/pnp/copilot-prompts/tree/main/samples/skills/api-docs-generator


### Generate OpenAPI

Steps:
1. open file, right click on edit window for context menu
2. select Generate Code -> Generate Docs
3. USE PROMPT: Generate OpenAPI documentation for this file. Output documentation in YAML format

### Generate Unit Test?

1. Use Copilot Chat Prompts

This is the most flexible method, allowing you to guide the AI with natural language.

Open the Copilot Chat window in your IDE (e.g., in VS Code, Ctrl+Alt+I (Ctrl+Cmd+I) or View > GitHub Copilot Chat).

Provide a descriptive prompt. To improve the quality of the generated tests, be specific about the API endpoints, expected inputs/outputs, and edge cases.

Example Prompts:
"Generate unit tests for the validateUser function in this file".
"Write API integration tests for the /api/users/register endpoint, including happy path, invalid inputs, and error handling".
"Create tests that cover edge cases for the processPayment method".

2. Use Slash Commands
   Slash commands are a quick way to generate tests for the current file or a specific target.

Open the Copilot Chat window.

Type /tests followed by an optional target (e.g., a class name or method name) and the desired testing framework.

Example Commands:
/tests (generates tests for the entire active file).
/tests #UserService (generates tests for the UserService class).
@Test #target (for GitHub Copilot Testing in Visual Studio).

3. Use Editor Smart Actions/Context Menu
   For a quick, in-editor experience, you can use the context menu.

Open the file containing the API code.
(Optional) Select the specific code (function or method) you want to test.
Right-click in the editor and select Copilot > Generate Tests (or a similar option depending on your IDE setup).


### Fix Code Prompt Sample

https://github.com/pnp/copilot-prompts/tree/main/samples/prompts/github-copilot-fix-code

### Others

https://code.visualstudio.com/docs/copilot/copilot-smart-actions

### training

https://learn.microsoft.com/en-us/training/modules/generate-documentation-using-github-copilot-tools/


### TODO - generate JSDOC for all function

Using Automatic Inline Suggestions
This method leverages Copilot's ability to provide context-aware code completions.

Place your cursor immediately above the function or method you want to document.
Type the beginning of a JSDoc comment: /**.
Press Enter or Tab. Copilot should automatically suggest the full JSDoc block, including @param and @returns tags based on the function's signature and body.
Accept the suggestion using a single Tab key press, just like a regular code completion.
Microsoft Dev Blogs
Microsoft Dev Blogs
+3
Using Copilot Chat
For more complex functions or for generating documentation for multiple items at once, you can use the interactive chat interface.
Medium
Medium
Open Copilot Chat: In VS Code, you can open the Copilot chat pane.
Highlight Code: Select the specific function or file for which you need JSDoc comments.
Prompt Copilot: Ask Copilot to generate the documentation using a natural language prompt. For example:
"Add a JSDoc comment above this function explaining what it does, with param types and return type."
Review and Insert: Copilot will provide the generated JSDoc in the chat. You can then review it and insert it into your code.
Medium
Medium
+4
