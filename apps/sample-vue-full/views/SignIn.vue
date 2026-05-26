<template>
  <div class="signin-page">

    <!-- ── Left decorative panel ── -->
    <aside class="panel-left" aria-hidden="true">
      <div class="grid-bg"></div>
      <div class="orb orb-a"></div>
      <div class="orb orb-b"></div>

      <div class="brand">
        <div class="brand-icon">N</div>
        <span class="brand-wordmark">novex</span>
      </div>

      <div class="pitch">
        <p class="pitch-label">Full-stack monorepo template</p>
        <h2 class="pitch-heading">
          Build faster.<br />
          <em>Ship smarter.</em>
        </h2>
        <ul class="stack-pills">
          <li>Node 24</li>
          <li>Vue 3</li>
          <li>Express</li>
          <li>ES Modules</li>
        </ul>
      </div>

      <blockquote class="side-quote">
        "The monorepo foundation we always wanted but never had time to build."
      </blockquote>
    </aside>

    <!-- ── Right form panel ── -->
    <main class="panel-right">
      <div class="form-area">

        <Transition name="panel-switch" mode="out-in">

          <!-- Login form -->
          <div v-if="mode === 'login'" key="login" class="form-card">
            <header class="form-head">
              <h1>Welcome back</h1>
              <p>Sign in to continue to your workspace</p>
            </header>

            <div class="fields">
              <label class="field" for="email-input">
                <span class="field-label">Email address</span>
                <a-input
                  id="email-input"
                  data-cy="username"
                  type="text"
                  placeholder="you@company.com"
                  v-model:value="email"
                  size="large"
                />
              </label>

              <label class="field" for="password-input">
                <span class="field-label">Password</span>
                <a-input
                  id="password-input"
                  data-cy="password"
                  type="password"
                  placeholder="Enter your password"
                  v-model:value="password"
                  size="large"
                />
              </label>

              <a-checkbox v-model:checked="forced" class="force-check">
                Force login (bypass backend)
              </a-checkbox>
            </div>

            <div class="actions">
              <a-button
                data-cy="login"
                type="primary"
                block
                size="large"
                class="btn-main"
                @click="login"
              >
                Sign In
                <svg class="btn-arrow" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 10h12M11 5l5 5-5 5"/>
                </svg>
              </a-button>

              <div class="or-row"><span>or</span></div>

              <a-button
                block
                size="large"
                class="btn-oauth"
                @click="oauthLogin"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                Continue with OAuth
              </a-button>
            </div>

            <p class="signup-hint">
              No account yet?
              <router-link to="/signup">Create one</router-link>
            </p>
          </div>

          <!-- OTP form -->
          <div v-else key="otp" class="form-card">
            <header class="form-head">
              <div class="otp-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h1>Check your email</h1>
              <p>Enter the 6-digit verification code we sent you</p>
            </header>

            <div class="fields">
              <label class="field" for="pin-input">
                <span class="field-label">Verification code</span>
                <a-input
                  id="pin-input"
                  data-cy="pin"
                  type="text"
                  placeholder="000000"
                  v-model:value="otp"
                  size="large"
                  class="otp-code-input"
                  maxlength="6"
                />
              </label>
            </div>

            <div class="actions">
              <a-button
                type="primary"
                block
                size="large"
                class="btn-main"
                data-cy="otp"
                @click="otpLogin"
              >
                Verify Code
                <svg class="btn-arrow" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 10h12M11 5l5 5-5 5"/>
                </svg>
              </a-button>
            </div>
          </div>

        </Transition>

        <!-- Error banner -->
        <Transition name="fade-up">
          <div v-if="errorMessage" class="error-banner" role="alert">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            {{ errorMessage }}
          </div>
        </Transition>

        <p class="device-hint">{{ isMobile ? 'Mobile view' : 'Desktop view' }}</p>
      </div>
    </main>

  </div>
</template>

<script setup>
import parseJwt from '@common/iso/parse-jwt.js';
import { http } from '@common/vue/plugins/fetch.js';
import { useI18n } from '@common/vue/plugins/i18n.js';
import { useMediaQuery } from '@common/vue/plugins/useMediaQuery.js';
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useMainStore } from '../store.js';

const { VITE_REFRESH_URL, MODE } = import.meta.env;
const store = useMainStore();
const route = useRoute();
const i18n = useI18n();
const loading = store.loading;
const email = ref('test');
const password = ref('test');
const errorMessage = ref('');
const mode = ref('login'); // login, otp
const otp = ref('');

const forced = ref(false);
let otpCount = 0;
let otpId = '';

const isMobile = useMediaQuery('(max-width: 425px)');

const setToLogin = () => {
  mode.value = 'login';
  otp.value = '';
  otpCount = 0;
};

onUnmounted(() => console.log('signIn unmounted'));

onMounted(async () => {
  console.log('signIn mounted!', route.hash);
  setToLogin();
  otp.value = '111111';
  errorMessage.value = '';
  store.loading = false;
});

onBeforeUnmount(() => {
  // console.log('signIn onBeforeUnmount')
});

const _setUser = async (data, user) => {
  await store.doLogin(user);
};

const login = async () => {
  console.log('login clicked', forced.value);
  if (forced.value) {
    _setUser(null, {
      id: 1,
      access_token: '',
      refresh_token: '',
    });
    return;
  }
  if (store.value) return;
  store.loading = true;
  errorMessage.value = '';
  try {
    const { data } = await http.post('/api/auth/login', {
      email: email.value,
      password: password.value,
    });
    if (data.otp) {
      mode.value = 'otp';
      otpId = data.otp;
      otpCount = 0;
    } else {
      const user = parseJwt(data.access_token);
      http.setTokens({ access: data.access_token, refresh: data.refresh_token });
      http.setOptions({ refreshUrl: VITE_REFRESH_URL });
      _setUser(data, user);
    }
  } catch (e) {
    console.log('login error', e.toString(), e);
    errorMessage.value = e?.data?.message || e.toString();
  }
  store.loading = false;
};

const otpLogin = async () => {
  if (store.loading) return;
  store.loading = true;
  errorMessage.value = '';
  try {
    http.setOptions({ refreshUrl: VITE_REFRESH_URL });
    const { data } = await http.post('/api/auth/otp', { id: otpId, pin: otp.value });
    const user = parseJwt(data.access_token);
    http.setTokens({ access: data.access_token, refresh: data.refresh_token });
    http.setOptions({ refreshUrl: VITE_REFRESH_URL });
    _setUser(data, user);
  } catch (e) {
    if (e?.data?.message === 'Token Expired Error') {
      errorMessage.value = 'OTP Expired';
      setToLogin();
    } else if (otpCount < 3) {
      otpCount++;
      errorMessage.value = 'OTP Error';
    } else {
      errorMessage.value = 'OTP Tries Exceeded';
      setToLogin();
    }
  }
  store.loading = false;
};

const oauthLogin = () => {
  alert('Please set appropriate callback URL at oauth side');
  if (MODE === 'mocked') {
    window.location.assign('/callback#mocked');
  } else {
    const OAUTH_URL = 'https://github.com/login/oauth/authorize?scope=user:email&client_id';
    const OAUTH_CLIENT_ID = 'a355948a635c2a2066e2';
    http.setOptions({ refreshUrl: VITE_REFRESH_URL });
    window.location.replace(`${OAUTH_URL}=${OAUTH_CLIENT_ID}`);
  }
};
</script>

<style scoped>
/* ── Reset & tokens ───────────────────────────────── */
.signin-page {
  --indigo-500: #4f46e5;
  --indigo-600: #4338ca;
  --indigo-100: #e0e7ff;
  --violet-500: #7c3aed;
  --slate-50:   #f8fafc;
  --slate-100:  #f1f5f9;
  --slate-200:  #e2e8f0;
  --slate-400:  #94a3b8;
  --slate-500:  #64748b;
  --slate-600:  #475569;
  --slate-700:  #334155;
  --slate-900:  #0f172a;
  --navy-950:   #07091a;
  --navy-900:   #0c0f28;
  --red-50:     #fef2f2;
  --red-200:    #fecaca;
  --red-600:    #dc2626;

  display: flex;
  min-height: 100vh;
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--navy-950);
}

/* ── Left panel ───────────────────────────────────── */
.panel-left {
  position: relative;
  flex: 0 0 52%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 52px 64px;
  background: var(--navy-950);
}

/* subtle dot-grid */
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(148, 163, 220, 0.18) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
}

/* glow orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.orb-a {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 65%);
  top: -140px;
  right: -140px;
  animation: float-a 9s ease-in-out infinite alternate;
}

.orb-b {
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, transparent 65%);
  bottom: 60px;
  left: -60px;
  animation: float-b 12s ease-in-out infinite alternate;
}

@keyframes float-a {
  to { transform: translate(-24px, 32px) scale(1.08); }
}
@keyframes float-b {
  to { transform: translate(20px, -24px) scale(1.05); }
}

/* brand */
.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, var(--indigo-500), var(--violet-500));
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-weight: 900;
  font-size: 20px;
  color: #fff;
  box-shadow: 0 0 24px rgba(99, 102, 241, 0.5);
}

.brand-wordmark {
  font-family: 'DM Sans', sans-serif;
  font-size: 21px;
  font-weight: 700;
  color: #dde4f5;
  letter-spacing: 0.06em;
}

/* pitch block */
.pitch {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-bottom: 44px;
}

.pitch-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6366f1;
  margin: 0 0 18px;
}

.pitch-heading {
  font-family: 'DM Sans', sans-serif;
  font-size: clamp(40px, 4.8vw, 70px);
  font-weight: 900;
  line-height: 1.04;
  color: #eef2ff;
  margin: 0 0 28px;
}

.pitch-heading em {
  font-style: italic;
  color: #a5b4fc;
}

.stack-pills {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stack-pills li {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 999px;
  padding: 4px 12px;
}

.side-quote {
  position: relative;
  z-index: 1;
  margin: 0;
  padding-left: 16px;
  border-left: 2px solid rgba(99, 102, 241, 0.35);
  font-size: 13px;
  font-style: italic;
  color: var(--slate-500);
  line-height: 1.65;
}

/* ── Right panel ──────────────────────────────────── */
.panel-right {
  flex: 1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 48px;
  position: relative;
}

/* thin gradient accent at top */
.panel-right::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--indigo-500), var(--violet-500), #ec4899);
}

.form-area {
  width: 100%;
  max-width: 396px;
}

/* ── Form card ────────────────────────────────────── */
.form-card {
  width: 100%;
}

.form-head {
  margin-bottom: 32px;
}

.form-head h1 {
  font-family: 'DM Sans', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: var(--slate-900);
  margin: 0 0 6px;
  line-height: 1.15;
}

.form-head p {
  font-size: 14px;
  color: var(--slate-500);
  margin: 0;
}

/* OTP lock icon */
.otp-icon-wrap {
  width: 52px;
  height: 52px;
  background: var(--indigo-100);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--indigo-500);
  margin-bottom: 16px;
}

/* ── Fields ───────────────────────────────────────── */
.fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: default;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--slate-700);
  letter-spacing: 0.01em;
}

/* Ant Design input overrides */
:deep(.ant-input-affix-wrapper.ant-input-affix-wrapper-lg),
:deep(.ant-input.ant-input-lg) {
  height: 44px;
  border-radius: 9px;
  border: 1.5px solid var(--slate-200);
  background: var(--slate-50);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: var(--slate-900);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

:deep(.ant-input-affix-wrapper.ant-input-affix-wrapper-lg) {
  padding: 0 12px;
  display: flex;
  align-items: center;
}

:deep(.ant-input-affix-wrapper.ant-input-affix-wrapper-lg .ant-input) {
  height: 100%;
  border: none;
  box-shadow: none;
  background: transparent;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
}

:deep(.ant-input-affix-wrapper.ant-input-affix-wrapper-lg:hover),
:deep(.ant-input.ant-input-lg:hover) {
  border-color: #818cf8;
}

:deep(.ant-input-affix-wrapper-focused),
:deep(.ant-input-affix-wrapper.ant-input-affix-wrapper-lg:focus-within),
:deep(.ant-input.ant-input-lg:focus) {
  border-color: var(--indigo-500) !important;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12) !important;
  background: #fff !important;
  outline: none;
}

/* OTP input: big centered digits */
.otp-code-input :deep(.ant-input.ant-input-lg) {
  text-align: center;
  font-size: 22px;
  letter-spacing: 0.45em;
  font-weight: 600;
  padding-left: 0.45em;
}

/* Force-login checkbox */
:deep(.force-check .ant-checkbox-wrapper),
:deep(.force-check) {
  font-size: 13px;
  color: var(--slate-500);
  font-family: 'DM Sans', sans-serif;
}

:deep(.force-check .ant-checkbox-checked .ant-checkbox-inner) {
  background-color: var(--indigo-500);
  border-color: var(--indigo-500);
}

/* ── Actions ──────────────────────────────────────── */
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

/* Primary "Sign In" button */
:deep(.btn-main.ant-btn-primary) {
  height: 46px;
  border-radius: 9px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  background: linear-gradient(135deg, var(--indigo-500) 0%, var(--violet-500) 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: box-shadow 0.2s, transform 0.15s, background 0.2s;
}

:deep(.btn-main.ant-btn-primary:hover:not(:disabled)) {
  background: linear-gradient(135deg, var(--indigo-600) 0%, #6d28d9 100%) !important;
  box-shadow: 0 6px 22px rgba(79, 70, 229, 0.48);
  transform: translateY(-1px);
}

:deep(.btn-main.ant-btn-primary:active) {
  transform: translateY(0);
}

.btn-arrow {
  transition: transform 0.15s ease;
}

:deep(.btn-main.ant-btn-primary:hover) .btn-arrow {
  transform: translateX(3px);
}

/* OAuth button */
:deep(.btn-oauth.ant-btn-default) {
  height: 46px;
  border-radius: 9px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  border: 1.5px solid var(--slate-200);
  color: var(--slate-700);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

:deep(.btn-oauth.ant-btn-default:hover) {
  border-color: var(--indigo-500) !important;
  color: var(--indigo-500) !important;
  background: var(--slate-50) !important;
}

/* "or" divider */
.or-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 0;
}

.or-row::before,
.or-row::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--slate-200);
}

.or-row span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--slate-500);
}

/* Sign-up hint */
.signup-hint {
  text-align: center;
  font-size: 13px;
  color: var(--slate-500);
  margin: 0;
}

.signup-hint a {
  color: var(--indigo-500);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.15s;
}

.signup-hint a:hover {
  color: var(--indigo-600);
  text-decoration: underline;
}

/* ── Error banner ─────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 11px 14px;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--red-600);
}

/* ── Device hint ──────────────────────────────────── */
.device-hint {
  text-align: center;
  font-size: 11px;
  color: var(--slate-500);
  margin-top: 24px;
}

/* ── Panel switch transition ──────────────────────── */
.panel-switch-enter-active,
.panel-switch-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-switch-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.panel-switch-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* ── Fade-up transition ───────────────────────────── */
.fade-up-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

/* ── Responsive: hide left panel on mobile ────────── */
@media (max-width: 768px) {
  .panel-left {
    display: none;
  }

  .panel-right {
    padding: 32px 24px;
  }
}
</style>
