import { customType } from 'drizzle-orm/pg-core';
import pgvector from 'pgvector/pg';

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(val: number[]): string {
    return pgvector.toSql(val);
  },
});
