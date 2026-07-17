export const ROUTES = [
  // you can change this to your custom views for Not Found and Not Allowed (Forbidden) view
  // { path: '/:catchAll(.*)', name: 'catchAll', redirect: { name: 'SignIn' }, meta: { requiresAuth: false, layout: 'layout-public' } },
  { path: '/forbidden', name: 'NotAllowed', component: () => import('@common/vue/views/NotAllowed.vue') },
  { path: '/:catchAll(.*)', name: 'NotFound', component: () => import('@common/vue/views/NotFound.vue') },
];
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Home', component: () => import('../views/SignIn.vue') },
  { path: '/signin', name: 'SignIn', component: () => import('../views/SignIn.vue') },
  { path: '/callback', name: 'Callback', component: () => import('../views/Callback.vue') },
];
export const SECURE_ROUTES = [
  { path: '/dashboard', name: 'Dashboard', component: async () => import('../views/Dashboard.vue') },
  { path: '/demo/test', name: 'Tests', component: async () => import('../views/Demo/DemoTest.vue') },
  { path: '/demo/web-cam', name: 'Web Cam', component: () => import('../views/Demo/DemoWebCam.vue') },
  { path: '/demo/sign-pad', name: 'Sign Pad', component: async () => import('../views/Demo/DemoSignPad.vue') },
  {
    path: '/t4t-link/:table?',
    name: 'T4t-Link',
    component: async () => import('../views/T4t.vue'),
    props: route => ({
      tableName: route.params.table,
      filterKeys: route.query.fkeys,
      filterVals: route.query.fvals,
    }),
    hidden: true,
  },
  {
    path: '/t4t-student',
    name: 'T4t - Student',
    component: async () => import('../views/T4t.vue'),
    props: { tableName: 'student' },
  },
  {
    path: '/t4t-subject',
    name: 'T4t - Subject',
    component: async () => import('../views/T4t.vue'),
    props: { tableName: 'subject' },
  },
  {
    path: '/audit-logs',
    name: 'T4t - Audit Logs',
    component: async () => import('../views/T4t.vue'),
    props: { tableName: 't4t_audit_logs' },
  },

  { path: '/visuals/g2-chart1', name: 'Demo Chart1', component: async () => import('../views/Visuals/DemoChart1.vue') },
  { path: '/visuals/leaflet-map', name: 'Leaflet', component: () => import('../views/Visuals/DemoLeaflet.vue') },

  { path: '/data-entry/form', name: 'Form', component: async () => import('../views/DataEntry/DemoForm.vue') },
  { path: '/data-entry/card', name: 'Card', component: async () => import('../views/DataEntry/DemoCard.vue') },
  { path: '/data-entry/cascade', name: 'Cascade', component: async () => import('../views/DataEntry/DemoCascade.vue') },
  {
    path: '/data-entry/cascade2',
    name: 'Cascade2',
    component: async () => import('../views/DataEntry/DemoCascade2.vue'),
  },
  {
    path: '/favv/cascade2-api',
    name: 'Casecase2 (API) FAVV',
    component: async () => import('../views/Favv/DemoCascade2Api.vue'),
  },

  { path: '/whatsapp/test', name: 'WhatsApp Test', component: async () => import('../views/WhatsAppTest.vue') },
  {
    path: '/whatsapp/broadcast',
    name: 'WA Broadcast',
    component: async () => import('../views/WhatsAppBroadcast.vue'),
  },
  {
    path: '/whatsapp/templates',
    name: 'WA Templates',
    component: async () => import('../views/WhatsAppTemplates.vue'),
  },
  { path: '/sendgrid/test', name: 'Email Test', component: async () => import('../views/SendgridTest.vue') },
  {
    path: '/sendgrid/broadcast',
    name: 'Email Broadcast',
    component: async () => import('../views/SendgridBroadcast.vue'),
  },
  {
    path: '/sendgrid/templates',
    name: 'Email Templates',
    component: async () => import('../views/SendgridTemplates.vue'),
  },
  { path: '/telegram/test', name: 'Telegram Test', component: async () => import('../views/TelegramTest.vue') },
  {
    path: '/telegram/broadcast',
    name: 'TG Broadcast',
    component: async () => import('../views/TelegramBroadcast.vue'),
  },
  { path: '/comms-config', name: 'Comms Config', component: async () => import('../views/TenantCommsConfig.vue') },
  { path: '/security', name: 'Security', component: async () => import('../views/SecuritySettings.vue') },

  { path: '/demo-view/fill', name: 'Fill No Param', component: async () => import('../views/Demo/Filler.vue') },
  {
    path: '/demo-view/fill/:param',
    name: 'Fill Param',
    component: async () => import('../views/Demo/Filler.vue'),
    hidden: true,
  },
  { path: '/test', name: 'Fill No ID', component: async () => import('../views/Demo/Filler.vue') },
  ...Array.from(Array(15), (x, i) => {
    return {
      path: `/test/${i}`,
      name: `Fill ID ${i}`,
      component: async () => import('../views/Demo/Filler.vue'),
      props: { testId: i },
    };
  }),
];
