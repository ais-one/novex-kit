// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED — DO NOT EDIT
// Re-run `npm run generate:crud` to regenerate this file.
// Source table: student
// ─────────────────────────────────────────────────────────────────────────────
import * as realServices from '@common/node/services';
import { student as table } from '@db/sample/schema';
import { eq } from 'drizzle-orm';

// biome-ignore lint/suspicious/noExplicitAny: services interface varies by store type
let services: any = realServices;

// Allows unit tests to inject a mock without needing ESM module mocking
// biome-ignore lint/suspicious/noExplicitAny: test injection
export const _injectServices = (mock: any) => {
  services = mock;
};

const db = () => services.get('drizzle1');

const create = async (req, res) => {
  const result = await db().insert(table).values(req.body).returning({ id: table.id });
  return res.status(201).json(result[0]);
};

const findOne = async (req, res) => {
  const rows = await db()
    .select({
      id: table.id,
      firstName: table.firstName,
      lastName: table.lastName,
      avatar: table.avatar,
      kyc: table.kyc,
      awards: table.awards,
      sex: table.sex,
      age: table.age,
      gpa: table.gpa,
      birthDate: table.birthDate,
      birthTime: table.birthTime,
      country: table.country,
      state: table.state,
      dateTimeTz: table.dateTimeTz,
      remarks: table.remarks,
      updated_by: table.updated_by,
      updated_at: table.updated_at,
    })
    .from(table)
    .where(eq(table.id, Number(req.params.id)))
    .limit(1);
  if (rows.length) return res.status(200).json(rows[0]);
  return res.status(404).json({});
};

const update = async (req, res) => {
  const result = await db()
    .update(table)
    .set(req.body)
    .where(eq(table.id, Number(req.params.id)));
  const count = result.rowCount ?? 0;
  return res.status(count ? 200 : 404).json({ count });
};

const find = async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const page = req.query.page ? Number(req.query.page) : 0;
  const result = await db()
    .select({
      id: table.id,
      firstName: table.firstName,
      lastName: table.lastName,
      avatar: table.avatar,
      kyc: table.kyc,
      awards: table.awards,
      sex: table.sex,
      age: table.age,
      gpa: table.gpa,
      birthDate: table.birthDate,
      birthTime: table.birthTime,
      country: table.country,
      state: table.state,
      dateTimeTz: table.dateTimeTz,
      remarks: table.remarks,
      updated_by: table.updated_by,
      updated_at: table.updated_at,
    })
    .from(table)
    .limit(limit)
    .offset((page > 0 ? page - 1 : 0) * limit);
  return res.status(200).json(result);
};

const remove = async (req, res) => {
  const result = await db()
    .delete(table)
    .where(eq(table.id, Number(req.params.id)));
  const count = result.rowCount ?? 0;
  return res.status(count ? 200 : 404).json({ count });
};

export default { create, findOne, update, find, remove };
