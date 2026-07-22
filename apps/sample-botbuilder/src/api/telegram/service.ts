import { sendMessage } from '@common/node/comms/telegram2/outbound';
import { botbuilderGraphs, botbuilderMessages, botbuilderSessions } from '@db/sample/schema';
import { eq } from 'drizzle-orm';
import { buildGraph } from '../../graph/builder.ts';
import type { BotStateType, GraphConfig } from '../../graph/state.ts';
import { db } from '../../lib/db.ts';
import { connectMcp } from '../../lib/mcp-client.ts';

function freshState(chatId: string, userName: string, message: string): BotStateType {
  return {
    chatId,
    userName,
    message,
    messageType: 'text',
    history: [],
    variables: {},
    agentResponse: undefined,
    nextEdge: undefined,
    conditionResult: undefined,
    handoverRequired: false,
    sessionEnded: false,
    requireUserInput: true,
    resumeNodeId: undefined,
    lastNodeId: undefined,
    pendingMessages: [],
  } as BotStateType;
}

export async function handleWebhook(body: Record<string, unknown>): Promise<void> {
  const { handleUpdate } = await import('@common/node/comms/telegram2/inbound');
  const update = handleUpdate(body as unknown as Parameters<typeof handleUpdate>[0]);
  logger.info(`[bot] updateType=${update.updateType}`);
  if (update.updateType !== 'message') return;

  const data = update.data as Record<string, unknown>;
  const chatId = String((data.chat as Record<string, unknown>)?.id || '');
  const text =
    (data.content as Record<string, unknown>)?.type === 'text'
      ? String((data.content as Record<string, unknown>).text || '')
      : '';
  const userName = ((data.from as Record<string, unknown>)?.first_name as string) || '';

  logger.info(`[bot] chatId=${chatId} text="${text.slice(0, 80)}"`);
  if (!chatId || !text) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('[bot] TELEGRAM_BOT_TOKEN not set');
    return;
  }

  // /reset command — delete session and start fresh
  if (text.trim().toLowerCase() === '/reset') {
    await db().delete(botbuilderSessions).where(eq(botbuilderSessions.chatId, chatId));
    await sendMessage(botToken, chatId, '🔄 Session reset. Send any message to start a new conversation.');
    logger.info(`[bot] session reset for chatId=${chatId}`);
    return;
  }

  // Phase 1: DB — session lookup/create + persist user message (short transaction)
  let session: typeof botbuilderSessions.$inferSelect;
  let state: BotStateType;
  let graphConfig: typeof botbuilderGraphs.$inferSelect | undefined;

  await db().transaction(async tx => {
    const [existingSession] = await tx.select().from(botbuilderSessions).where(eq(botbuilderSessions.chatId, chatId));

    if (!existingSession) {
      logger.info(`[bot] creating new session for chatId=${chatId}`);
      const [publishedGraph] = await tx.select().from(botbuilderGraphs).where(eq(botbuilderGraphs.status, 'published'));

      if (!publishedGraph) {
        logger.error('[bot] no published graph config found');
        return;
      }
      graphConfig = publishedGraph;
      state = freshState(chatId, userName, text);

      [session] = await tx
        .insert(botbuilderSessions)
        .values({
          chatId,
          userName,
          graphId: publishedGraph.id,
          currentNodeId: 'trigger',
          state: state as unknown as Record<string, unknown>,
          status: 'active',
        })
        .returning();
    } else {
      session = existingSession;
      if (session.status === 'ended') {
        logger.info(`[bot] reactivating ended session for chatId=${chatId}`);
        state = freshState(chatId, userName, text);
        [session] = await tx
          .update(botbuilderSessions)
          .set({
            state: state as unknown as Record<string, unknown>,
            currentNodeId: 'trigger',
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(botbuilderSessions.id, session.id))
          .returning();
      } else {
        logger.info(`[bot] resuming session id=${session.id} for chatId=${chatId}`);
        state = { ...(session.state as unknown as BotStateType) };
        // Resume from the node where we paused last time.
        // If the session's currentNodeId doesn't match any node in the current graph
        // (e.g. after seed update), the builder will fall back to the trigger node.
        state.resumeNodeId = session.currentNodeId || undefined;
      }
      state.message = text;
      state.requireUserInput = true;

      const [g] = await tx.select().from(botbuilderGraphs).where(eq(botbuilderGraphs.id, session.graphId!));
      graphConfig = g;
    }

    if (graphConfig) {
      await tx.insert(botbuilderMessages).values({
        sessionId: session.id,
        role: 'user',
        content: text,
        contentType: 'text',
      });
    }
  });

  if (!graphConfig) {
    await sendMessage(botToken, chatId, 'No active bot configuration found.');
    return;
  }

  // When user is on a listen_trigger, restart from the entry node.
  // The router-agent will classify the message and route to the correct flow.
  const flow = graphConfig.flow as unknown as GraphConfig;
  const currentNode = flow.nodes.find(n => n.id === session!.currentNodeId);
  if (currentNode?.type === 'listen-trigger') {
    const triggerNode = flow.nodes.find(n => n.type === 'trigger');
    if (triggerNode) {
      logger.info(`[bot] on listen_trigger, restarting from entry: ${triggerNode.id}`);
      state!.resumeNodeId = triggerNode.id;
    }
  }

  // Phase 2: External — MCP + graph execution (no DB connection held)
  logger.info('[bot] connecting to MCP...');
  const mcpClient = await connectMcp(process.env.MCP_SERVER_URL || 'http://localhost:3100/mcp');
  logger.info('[bot] building graph...');
  const compiledGraph = await buildGraph(graphConfig.flow as unknown as GraphConfig, mcpClient);
  logger.info('[bot] invoking graph...');

  let result: BotStateType;
  try {
    // Clear pending messages from previous invocation to avoid duplicates
    state!.pendingMessages = [];
    // Add user message to history so nodes can see the full conversation
    state!.history = [...(state!.history || []), { role: 'user', content: text }];
    result = (await compiledGraph.invoke(state!)) as BotStateType;
  } catch (err) {
    logger.error('[bot] graph invocation error:', (err as Error).message);
    await sendMessage(botToken, chatId, 'Sorry, something went wrong. Please try again.');
    return;
  }

  logger.info(
    `[bot] graph result: pendingMessages=${result.pendingMessages?.length || 0}, last="${(result.agentResponse || '').slice(0, 60)}"`,
  );

  // Phase 3: DB — persist all bot messages + update session state (short transaction)
  const messages = result.pendingMessages || (result.agentResponse ? [result.agentResponse] : []);

  await db().transaction(async tx => {
    for (const msg of messages) {
      await tx.insert(botbuilderMessages).values({
        sessionId: session!.id,
        role: 'bot',
        content: msg,
        contentType: 'text',
      });
    }

    await tx
      .update(botbuilderSessions)
      .set({
        currentNodeId: result.lastNodeId || 'trigger',
        state: result as unknown as Record<string, unknown>,
        status: result.sessionEnded ? 'ended' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(botbuilderSessions.id, session!.id));
  });

  // Phase 4: Send ALL pending messages AFTER DB commit
  for (const msg of messages) {
    await sendMessage(botToken, chatId, msg);
  }
}
