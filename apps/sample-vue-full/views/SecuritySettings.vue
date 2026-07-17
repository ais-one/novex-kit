<template>
  <div class="security-page">
    <a-card title="Two-Factor Authentication">
      <template v-if="loading">
        <a-spin />
      </template>

      <template v-else>
        <a-alert
          v-if="!mfaEnabled"
          type="info"
          message="Two-factor authentication is not enabled"
          description="Add an extra layer of security to your account by enabling 2FA."
          show-icon
          class="alert"
        />
        <a-alert
          v-else
          type="success"
          message="Two-factor authentication is enabled"
          description="Your account is protected with Google Authenticator."
          show-icon
          class="alert"
        />

        <div class="actions">
          <a-button
            v-if="!mfaEnabled && !setupMode"
            type="primary"
            size="large"
            @click="startSetup"
          >
            Enable 2FA
          </a-button>

          <template v-if="setupMode">
            <div class="setup-step">
              <h3>1. Scan the QR code</h3>
              <p>Open Google Authenticator and scan this QR code, or enter the key manually.</p>
              <div v-if="qrData" class="qr-wrapper">
                <img :src="qrData" alt="QR Code" />
              </div>
              <div class="manual-key">
                <span class="label">Manual setup key:</span>
                <code>{{ setupSecret }}</code>
              </div>
            </div>

            <div class="setup-step">
              <h3>2. Verify the code</h3>
              <p>Enter the 6-digit code from your authenticator app.</p>
              <a-input
                v-model:value="pin"
                placeholder="000000"
                :maxlength="6"
                class="pin-input"
                size="large"
              />
              <a-button
                type="primary"
                :disabled="pin.length !== 6"
                :loading="activating"
                @click="activate"
              >
                Verify & Activate
              </a-button>
            </div>

            <div v-if="recoveryCodes.length > 0" class="setup-step recovery">
              <h3>3. Save your recovery codes</h3>
              <a-alert
                type="warning"
                message="These codes are shown only once. Save them somewhere safe."
                show-icon
                class="alert"
              />
              <div class="codes">
                <div v-for="(code, i) in recoveryCodes" :key="i" class="code">
                  {{ code }}
                </div>
              </div>
              <a-button type="primary" @click="finishSetup">
                I've saved these codes
              </a-button>
            </div>
          </template>

          <template v-if="mfaEnabled">
            <a-button
              type="primary"
              class="regenerate-btn"
              @click="regenerate"
            >
              Regenerate Recovery Codes
            </a-button>

            <a-popconfirm
              title="Enter your password to disable 2FA"
              ok-text="Deactivate"
              cancel-text="Cancel"
              @confirm="showDeactivateModal = true"
            >
              <a-button danger>
                Disable 2FA
              </a-button>
            </a-popconfirm>

            <a-modal
              v-model:visible="showDeactivateModal"
              title="Disable Two-Factor Authentication"
              @ok="deactivate"
              :confirm-loading="deactivating"
              ok-text="Deactivate"
              ok-danger
            >
              <a-input-password
                v-model:value="deactivatePassword"
                placeholder="Enter your password"
                size="large"
              />
            </a-modal>
          </template>
        </div>

        <div v-if="regenCodes.length > 0" class="regen-result">
          <h3>New Recovery Codes</h3>
          <a-alert
            type="warning"
            message="These codes are shown only once. Save them somewhere safe."
            show-icon
          />
          <div class="codes">
            <div v-for="(code, i) in regenCodes" :key="i" class="code">
              {{ code }}
            </div>
          </div>
          <a-button type="primary" @click="regenCodes = []">
            I've saved these codes
          </a-button>
        </div>
      </template>
    </a-card>
  </div>
</template>

<script setup>
import { auth } from '@common/vue/plugins/fetch.js';
import { onMounted, ref } from 'vue';

const mfaEnabled = ref(false);
const loading = ref(true);
const setupMode = ref(false);
const setupSecret = ref('');
const qrData = ref('');
const pin = ref('');
const activating = ref(false);
const recoveryCodes = ref([]);
const regenCodes = ref([]);
const showDeactivateModal = ref(false);
const deactivatePassword = ref('');
const deactivating = ref(false);

onMounted(async () => {
  try {
    const { data } = await auth.get('/api/auth/mfa/totp/status');
    mfaEnabled.value = data.enabled;
  } catch {
    // not configured
  } finally {
    loading.value = false;
  }
});

const startSetup = async () => {
  try {
    const { data } = await auth.post('/api/auth/mfa/totp/setup', {});
    setupSecret.value = data.secret;
    const QRCode = (await import('qrcode')).default;
    qrData.value = await QRCode.toDataURL(data.uri, { width: 200 });
    setupMode.value = true;
  } catch (e) {
    console.error('setup error', e);
  }
};

const activate = async () => {
  activating.value = true;
  try {
    const { data } = await auth.post('/api/auth/mfa/totp/activate', {
      pin: pin.value,
      secret: setupSecret.value,
    });
    recoveryCodes.value = data.recovery_codes;
    mfaEnabled.value = true;
  } catch (e) {
    console.error('activate error', e);
  } finally {
    activating.value = false;
  }
};

const finishSetup = () => {
  setupMode.value = false;
  setupSecret.value = '';
  qrData.value = '';
  pin.value = '';
  recoveryCodes.value = [];
};

const regenerate = async () => {
  try {
    const { data } = await auth.post('/api/auth/mfa/recovery-codes/regenerate', {});
    regenCodes.value = data.recovery_codes;
  } catch (e) {
    console.error('regenerate error', e);
  }
};

const deactivate = async () => {
  deactivating.value = true;
  try {
    await auth.post('/api/auth/mfa/totp/deactivate', {
      password: deactivatePassword.value,
    });
    mfaEnabled.value = false;
    showDeactivateModal.value = false;
    deactivatePassword.value = '';
  } catch (e) {
    console.error('deactivate error', e);
  } finally {
    deactivating.value = false;
  }
};
</script>

<style scoped>
.security-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 16px;
}

.alert {
  margin-bottom: 16px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.setup-step {
  margin-top: 24px;
}

.setup-step h3 {
  margin-bottom: 8px;
}

.qr-wrapper {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.qr-wrapper img {
  width: 200px;
  height: 200px;
}

.manual-key {
  text-align: center;
  margin-top: 12px;
}

.manual-key .label {
  font-size: 12px;
  color: #888;
  display: block;
  margin-bottom: 4px;
}

.manual-key code {
  font-size: 14px;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 4px;
  word-break: break-all;
}

.pin-input {
  max-width: 200px;
  margin-bottom: 12px;
}

.pin-input input {
  text-align: center;
  font-size: 22px;
  letter-spacing: 0.45em;
  font-weight: 600;
}

.codes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0;
}

.code {
  font-family: monospace;
  font-size: 13px;
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  text-align: center;
}

.recovery {
  margin-bottom: 24px;
}

.regenerate-btn {
  margin-bottom: 8px;
}
</style>
