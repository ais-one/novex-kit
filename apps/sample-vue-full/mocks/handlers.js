import { HttpResponse, http } from 'msw';

const T4T_CONFIGS = {
  student: {
    conn: 'knex1',
    name: 'student',
    displayName: 'Students',
    view: 'admin,editor,viewer',
    update: 'admin,editor',
    create: 'admin',
    delete: 'admin',
    deleteLimit: 1,
    import: 'admin,editor',
    export: 'admin,editor',
    multiSelect: false,
    cols: {
      id: { label: 'ID', auto: 'pk', edit: 'readonly' },
      firstName: {
        label: 'First Name',
        filter: true,
        sort: true,
        required: true,
        add: true,
        edit: true,
        type: 'string',
        ui: { tag: 'input', attrs: { type: 'text' } },
      },
      lastName: {
        label: 'Last Name',
        required: true,
        add: true,
        edit: true,
        type: 'string',
        filter: true,
        ui: { tag: 'input', attrs: { type: 'text' } },
      },
      sex: {
        label: 'Sex',
        type: 'string',
        filter: true,
        add: true,
        edit: true,
        default: 'M',
        ui: {
          tag: 'select',
          attrs: {
            multiple: false,
            options: [
              { label: '', value: '' },
              { label: 'Male', value: 'M' },
              { label: 'Female', value: 'F' },
            ],
          },
        },
      },
      age: {
        label: 'Age',
        type: 'integer',
        filter: true,
        add: true,
        edit: true,
        ui: { tag: 'input', attrs: { type: 'number', min: 10, max: 90, step: 1 } },
      },
      gpa: {
        label: 'GPA',
        type: 'decimal',
        filter: true,
        add: true,
        edit: true,
        ui: { tag: 'input', attrs: { type: 'number' } },
      },
      birthDate: {
        label: 'Date of Birth',
        type: 'string',
        filter: true,
        add: true,
        edit: true,
        ui: { tag: 'input', attrs: { type: 'date' } },
      },
      remarks: { label: 'Remarks', type: 'string', add: true, edit: true, ui: { tag: 'textarea', attrs: { rows: 4 } } },
      updated_at: {
        label: 'Updated At',
        filter: true,
        auto: 'ts',
        edit: 'readonly',
        type: 'datetime',
        ui: { tag: 'input', attrs: { type: 'text' } },
      },
    },
  },
  subject: {
    conn: 'knex1',
    name: 'subject',
    displayName: 'Subjects',
    view: 'admin,editor,viewer',
    update: 'admin,editor',
    create: 'admin',
    delete: 'admin',
    deleteLimit: 2,
    import: 'admin,editor',
    export: 'admin,editor',
    multiSelect: true,
    cols: {
      code: {
        label: 'Code',
        multiKey: true,
        add: true,
        edit: 'readonly',
        type: 'string',
        ui: { tag: 'input', attrs: { type: 'text' } },
      },
      name: {
        label: 'Name',
        multiKey: true,
        add: true,
        edit: true,
        type: 'string',
        ui: { tag: 'input', attrs: { type: 'text' } },
      },
      passingGrade: {
        label: 'Passing Grade',
        add: true,
        edit: true,
        required: true,
        default: 50,
        type: 'integer',
        ui: { tag: 'input', attrs: { type: 'number', min: 1, max: 100, step: 1 } },
      },
    },
  },
  t4t_audit_logs: {
    conn: 'knex1',
    name: 'audit_logs',
    displayName: 'Audit Logs',
    view: 'admin,editor,viewer',
    update: null,
    create: null,
    delete: null,
    deleteLimit: -1,
    import: null,
    export: 'admin,editor',
    multiSelect: false,
    cols: {
      id: { label: 'ID', auto: 'pk', hide: true, add: 'hide', edit: 'readonly' },
      user: { label: 'User', type: 'string', ui: { tag: 'input' } },
      timestamp: {
        label: 'Timestamp',
        filter: true,
        type: 'datetime',
        ui: { tag: 'input', attrs: { type: 'datetime-local' } },
      },
      db_name: { label: 'DB Name', filter: true, type: 'string', ui: { tag: 'input' } },
      table_name: { label: 'Table Name', type: 'string', ui: { tag: 'input' } },
      op: { label: 'Operation', type: 'string', ui: { tag: 'input' } },
      cols_changed: { label: 'Cols Changed', type: 'string', ui: { tag: 'input' } },
      new_values: { label: 'New Vals', type: 'string', ui: { tag: 'input' } },
    },
  },
};

const T4T_DATA = {
  student: {
    results: [
      {
        __key: '1',
        id: 1,
        firstName: 'Alice',
        lastName: 'Smith',
        sex: 'F',
        age: 20,
        gpa: 3.8,
        birthDate: '2004-03-15',
        remarks: '',
        updated_at: '2025-01-10T08:00:00Z',
      },
      {
        __key: '2',
        id: 2,
        firstName: 'Bob',
        lastName: 'Jones',
        sex: 'M',
        age: 22,
        gpa: 3.2,
        birthDate: '2002-07-22',
        remarks: "Dean's list",
        updated_at: '2025-02-14T10:30:00Z',
      },
      {
        __key: '3',
        id: 3,
        firstName: 'Carol',
        lastName: 'Lee',
        sex: 'F',
        age: 21,
        gpa: 3.5,
        birthDate: '2003-11-05',
        remarks: '',
        updated_at: '2025-03-01T09:15:00Z',
      },
    ],
    total: 3,
  },
  subject: {
    results: [
      { __key: 'MATH|Mathematics', code: 'MATH', name: 'Mathematics', passingGrade: 50 },
      { __key: 'PHY|Physics', code: 'PHY', name: 'Physics', passingGrade: 55 },
      { __key: 'CHEM|Chemistry', code: 'CHEM', name: 'Chemistry', passingGrade: 55 },
      { __key: 'ENG|English', code: 'ENG', name: 'English', passingGrade: 60 },
    ],
    total: 4,
  },
  t4t_audit_logs: {
    results: [
      {
        __key: '1',
        id: 1,
        user: 'admin',
        timestamp: '2025-05-01T10:00:00Z',
        db_name: 'main',
        table_name: 'student',
        op: 'INSERT',
        cols_changed: 'firstName,lastName',
        new_values: '{"firstName":"Alice","lastName":"Smith"}',
      },
      {
        __key: '2',
        id: 2,
        user: 'editor',
        timestamp: '2025-05-02T14:30:00Z',
        db_name: 'main',
        table_name: 'student',
        op: 'UPDATE',
        cols_changed: 'gpa',
        new_values: '{"gpa":3.8}',
      },
    ],
    total: 2,
  },
};

export default [
  http.get('http://127.0.0.1:8080/api/msw/test', () => {
    return HttpResponse.json({ message: 'it works :)' });
  }),

  // T4t config endpoints
  http.get('http://127.0.0.1:8080/api/t4t/config/:table', ({ params }) => {
    const config = T4T_CONFIGS[params.table];
    if (!config) return HttpResponse.json({ error: 'Table not found' }, { status: 404 });
    return HttpResponse.json(config);
  }),

  // T4t find endpoints
  http.get('http://127.0.0.1:8080/api/t4t/find/:table', ({ params }) => {
    const data = T4T_DATA[params.table] ?? { results: [], total: 0 };
    return HttpResponse.json(data);
  }),

  // Auth endpoints
  http.post('http://127.0.0.1:8080/api/auth/login', () => {
    return HttpResponse.json({ otp: 1 });
  }),
  http.post('http://127.0.0.1:8080/api/auth/otp', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user_meta: { email: 'test', roles: ['TestGroup'] },
    });
  }),
  http.get('http://127.0.0.1:8080/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged Out' });
  }),
];
