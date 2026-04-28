import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  award,
  country,
  state,
  student,
  studentSubject,
  subject,
} from '../../../../common/compiled/node/services/db/schema.ts';
import countriesJson from './icc.json' with { type: 'json' };
import statesJson from './state.json' with { type: 'json' };

// biome-ignore lint/suspicious/noExplicitAny: schema type not needed for seed scripts
export async function seed(db: NodePgDatabase<any>): Promise<void> {
  await db.delete(studentSubject);
  await db.delete(subject);
  await db.delete(student);
  await db.delete(award);
  await db.delete(country);
  await db.delete(state);

  const countries = countriesJson.map(c => ({ ...c, updated: new Date() }));
  await db.insert(country).values(countries);
  await db.insert(state).values(statesJson);

  await db.insert(subject).values([
    { code: 'EL1', name: 'English', passingGrade: 40 },
    { code: 'EM', name: 'E Math', passingGrade: 41 },
    { code: 'AM', name: 'A Math', passingGrade: 42 },
    { code: 'PHY', name: 'Physics', passingGrade: 43 },
    { code: 'CHEM', name: 'Chemistry', passingGrade: 44 },
  ]);

  await db.insert(award).values([
    { code: 'ac', name: 'Academic' },
    { code: 'sp', name: 'Sports' },
    { code: 'cv', name: 'Civics' },
  ]);

  const students = Array.from({ length: 30 }, (_, idx) => ({
    firstName: 'first',
    lastName: `last${idx}`,
    avatar: '',
    kyc: '',
    awards: '',
    sex: idx % 2 === 0 ? 'M' : 'F',
    age: idx + 15,
    gpa: String((idx + 1) % 5),
    birthDate: '1976-04-19',
    birthTime: '06:00',
    country: 'SG',
    state: '',
    dateTimeTz: new Date(),
    secret: '1234',
    remarks: '',
    updated_by: 'someone',
    updated_at: new Date(),
  }));
  await db.insert(student).values(students);

  await db.insert(studentSubject).values([
    { studentId: 1, subjectCode: 'EM', gradeFinal: 'A', gradeDate: new Date('2024-10-01') },
    { studentId: 1, subjectCode: 'AM', gradeFinal: 'B', gradeDate: new Date('2024-10-01') },
    { studentId: 1, subjectCode: 'PHY', gradeFinal: 'D', gradeDate: new Date('2024-10-01') },
    { studentId: 2, subjectCode: 'EM', gradeFinal: 'C', gradeDate: new Date('2024-10-02') },
    { studentId: 2, subjectCode: 'CHEM', gradeFinal: 'B', gradeDate: new Date('2024-10-02') },
  ]);
}
