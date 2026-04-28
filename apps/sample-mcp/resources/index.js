export default function initResources(server) {
  server.resource('server-info', 'info://server', { mimeType: 'text/plain' }, async () => ({
    contents: [
      {
        uri: 'info://server',
        text: 'My Remote MCP Server v1.0 — Streamable HTTP',
      },
    ],
  }));

  // server.resource('config', 'config://app', async uri => {
  //   return {
  //     contents: [{ uri: uri.href, text: 'App configuration here' }],
  //   };
  // });

  // server.resource(
  //   'user-profile',
  //   new ResourceTemplate('users://{userId}/profile', { list: undefined }),
  //   async (uri, { userId }) => {
  //     return {
  //       contents: [{ uri: uri.href, text: `Profile data for user ${userId}` }],
  //     };
  //   },
  // );
}
