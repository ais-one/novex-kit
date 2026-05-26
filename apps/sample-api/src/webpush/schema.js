import { z } from 'zod';

export const WebPushSubSchema = z
  .object({
    subscription: z.string().min(1).meta({ description: 'Serialized PushSubscription object' }),
  })
  .meta({ id: 'WebPushSub' });

export const WebPushSendSchema = z
  .object({
    mode: z.string().min(1).meta({ example: 'notification' }),
    data: z
      .record(z.string(), z.unknown())
      .optional()
      .default({})
      .meta({ example: { title: 'Hello' } }),
  })
  .meta({ id: 'WebPushSend' });

export const WebPushParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().meta({ example: 1 }),
  })
  .meta({ id: 'WebPushParams' });
