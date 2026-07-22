<template>
  <div style="height: calc(100vh - 80px); display: flex; flex-direction: column">
    <!-- Toolbar -->
    <div style="padding: 8px 16px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; flex-shrink: 0; background: #fff">
      <a-input v-model:value="graphName" placeholder="Bot name" style="width: 200px" />
      <a-select v-model:value="graphStatus" style="width: 120px" :options="[{value:'draft',label:'Draft'},{value:'published',label:'Published'}]" />
      <a-button type="primary" @click="save" :loading="saving">Save</a-button>
      <a-button @click="$router.push('/botbuilder/list')">Back</a-button>
    </div>

    <div style="flex: 1; display: flex; overflow: hidden">
      <!-- Palette -->
      <div style="width: 220px; border-right: 1px solid #f0f0f0; overflow-y: auto; padding: 8px; background: #fafafa; flex-shrink: 0">
        <a-collapse v-model:activeKey="activeKeys" :bordered="false" style="background: transparent">
          <a-collapse-panel key="entry" header="Entry">
            <a-card v-for="n in entryNodes" :key="n.type" :draggable="true" @dragstart="onDragStart($event, n.type)" :title="n.label" size="small" style="cursor: grab; margin-bottom: 4px">
              <p style="font-size: 11px; margin: 0; color: #666">{{ n.desc }}</p>
            </a-card>
          </a-collapse-panel>
          <a-collapse-panel key="core" header="Core Nodes">
            <a-card v-for="n in coreNodes" :key="n.type" :draggable="true" @dragstart="onDragStart($event, n.type)" :title="n.label" size="small" style="cursor: grab; margin-bottom: 4px">
              <p style="font-size: 11px; margin: 0; color: #666">{{ n.desc }}</p>
            </a-card>
          </a-collapse-panel>
          <a-collapse-panel key="agentic" header="Agentic Nodes">
            <a-card v-for="n in agenticNodes" :key="n.type" :draggable="true" @dragstart="onDragStart($event, n.type)" :title="n.label" size="small" style="cursor: grab; margin-bottom: 4px; border-left: 3px solid #722ed1">
              <p style="font-size: 11px; margin: 0; color: #666">{{ n.desc }}</p>
            </a-card>
          </a-collapse-panel>
          <a-collapse-panel key="end" header="End">
            <a-card v-for="n in endNodes" :key="n.type" :draggable="true" @dragstart="onDragStart($event, n.type)" :title="n.label" size="small" style="cursor: grab; margin-bottom: 4px">
              <p style="font-size: 11px; margin: 0; color: #666">{{ n.desc }}</p>
            </a-card>
          </a-collapse-panel>
        </a-collapse>
      </div>

      <!-- Canvas -->
      <div style="flex: 1; position: relative" @drop="onDrop" @dragover.prevent>
        <VueFlow v-if="mounted" v-model="elements" :node-types="nodeTypes" :default-viewport="{ zoom: 1 }" @pane-click="deselect" @node-click="onNodeClick" @connect="onConnect" fit-view-on-init style="width: 100%; height: 100%">
          <Background />
          <Controls />
        </VueFlow>
      </div>

      <!-- Drawer Sidebar -->
      <a-drawer v-if="selectedNode" :open="true" title="Node Details" placement="right" width="300" :closable="true" @close="deselect">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <a-tag :color="nodeColor(selectedNode.type)">Type: {{ selectedNode.type }}</a-tag>
          <a-button size="small" danger @click="deleteSelected">Delete</a-button>
        </div>
        <!-- Common: Label + Description -->
        <a-form layout="vertical" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0">
          <a-form-item label="Label" :validate-status="labelError ? 'error' : ''" :help="labelError">
            <a-input v-model:value="nodeConfig.label" size="small" placeholder="kebab-case, e.g. refund-flow" @change="validateLabel" />
          </a-form-item>
          <a-form-item label="Description">
            <a-textarea v-model:value="nodeConfig.description" :rows="2" size="small" placeholder="Short description for AI classification" />
          </a-form-item>
        </a-form>
        <!-- Type-specific forms -->
        <TextForm v-if="selectedNode.type === 'text'" />
        <ConditionalForm v-if="selectedNode.type === 'conditional'" />
        <a-form v-if="selectedNode.type === 'router-agent'" layout="vertical">
          <a-form-item label="Custom Prompt (optional)">
            <a-textarea v-model:value="nodeConfig.systemPrompt" :rows="2" size="small" placeholder="Override auto-generated classification prompt" />
          </a-form-item>
          <a-form-item label="Connected Edges">
            <div v-for="edge in getOutgoingEdges(selectedNode.id)" :key="edge.id" style="font-size: 12px; margin-bottom: 4px">
              <a-tag color="blue">{{ edge.label || 'no-label' }}</a-tag> → {{ edge.target }}
            </div>
            <p v-if="getOutgoingEdges(selectedNode.id).length === 0" style="color: #999; font-size: 11px">No edges connected. Drag from the right handle to connect.</p>
          </a-form-item>
        </a-form>
        <a-form v-if="selectedNode.type === 'agent-handover'" layout="vertical">
          <a-form-item label="Message"><a-input v-model:value="nodeConfig.message" size="small" /></a-form-item>
        </a-form>
        <a-form v-if="selectedNode.type === 'send-attachment'" layout="vertical">
          <a-form-item label="File Path Variable"><a-input v-model:value="nodeConfig.filePathVar" size="small" placeholder="filePath" /></a-form-item>
          <a-form-item label="Caption"><a-input v-model:value="nodeConfig.caption" size="small" placeholder="Optional caption for the file" /></a-form-item>
        </a-form>
        <a-form v-if="selectedNode.type === 'tool-agent'" layout="vertical">
          <a-form-item label="System Prompt"><a-textarea v-model:value="nodeConfig.systemPrompt" :rows="3" size="small" /></a-form-item>
          <a-form-item label="Assigned Tools">
            <a-checkbox-group v-model:value="nodeConfig.assignedTools" style="display: flex; flex-direction: column; gap: 4px">
              <a-checkbox value="rag_search">Search KB</a-checkbox>
              <a-checkbox value="rag_list_documents">List KB Docs</a-checkbox>
              <a-checkbox value="generate_refund_pdf">Generate Refund PDF</a-checkbox>
              <a-checkbox value="openweather_get_weather">Get Weather</a-checkbox>
              <a-checkbox value="openweather_get_forecast">Get Forecast</a-checkbox>
            </a-checkbox-group>
          </a-form-item>
          <!-- Tool Output Mapping: only show for checked tools that have output schemas -->
          <template v-for="toolName in (nodeConfig.assignedTools || [])" :key="toolName">
            <a-form-item v-if="toolOutputSchemas[toolName]?.length" :label="`${toolLabel(toolName)} Output Mapping`">
              <div v-for="field in toolOutputSchemas[toolName]" :key="field.field" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px">
                <span style="font-size: 12px; min-width: 120px">{{ field.label }}:</span>
                <a-input
                  :value="(nodeConfig.toolOutputMapping || {})[toolName]?.[field.field] || ''"
                  @update:value="setToolOutputMapping(toolName, field.field, $event)"
                  size="small"
                  :placeholder="`e.g. ${toolName}_${field.field}`"
                />
              </div>
            </a-form-item>
          </template>
          <a-form-item label="Store to Variable">
            <a-input v-model:value="nodeConfig.stored_to" size="small" placeholder="e.g. refund_msg" />
          </a-form-item>
          <a-form-item label="Multiple Variables">
            <a-switch v-model:checked="nodeConfig.multipleVariables" size="small" />
            <span style="margin-left: 8px; color: #999; font-size: 12px">Store as JSON object to each key in stored_to (comma-separated)</span>
          </a-form-item>
        </a-form>
        <p v-if="!['text','conditional','router-agent','tool-agent','agent-handover','send-attachment'].includes(selectedNode.type)" style="color: #999; font-size: 12px">No additional config needed.</p>
      </a-drawer>
    </div>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { VueFlow } from '@vue-flow/core';
import { message } from 'ant-design-vue';
import { markRaw, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConditionalForm from './forms/ConditionalForm.vue';
import TextForm from './forms/TextForm.vue';
import AgentHandoverNode from './nodes/AgentHandoverNode.vue';
import ConditionalNode from './nodes/ConditionalNode.vue';
import EndSessionNode from './nodes/EndSessionNode.vue';
import ListenTriggerNode from './nodes/ListenTriggerNode.vue';
import RouterAgentNode from './nodes/RouterAgentNode.vue';
import SendAttachmentNode from './nodes/SendAttachmentNode.vue';
import TextNode from './nodes/TextNode.vue';
import ToolAgentNode from './nodes/ToolAgentNode.vue';
import TriggerNode from './nodes/TriggerNode.vue';
import { useBotBuilderStore } from './store.js';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const route = useRoute();
const router = useRouter();
const botId = route.params.id;
const isNew = !botId || botId === 'new';
const store = useBotBuilderStore();

const graphName = ref('New Bot');
const graphStatus = ref('draft');
const saving = ref(false);
const mounted = ref(false);
const elements = ref([]);
const selectedNode = ref(null);
const nodeConfig = reactive({});
const labelError = ref('');
const activeKeys = ref(['entry', 'core', 'agentic', 'end']);
const toolOutputSchemas = ref({});

let idCounter = 0;
const nextId = () => `n${++idCounter}`;

const nodeTypes = {
  trigger: markRaw(TriggerNode),
  text: markRaw(TextNode),
  conditional: markRaw(ConditionalNode),
  'listen-trigger': markRaw(ListenTriggerNode),
  'router-agent': markRaw(RouterAgentNode),
  'tool-agent': markRaw(ToolAgentNode),
  'agent-handover': markRaw(AgentHandoverNode),
  'end-session': markRaw(EndSessionNode),
  'send-attachment': markRaw(SendAttachmentNode),
};

const entryNodes = [
  { type: 'trigger', label: 'Trigger', desc: 'Entry point of the bot' },
  { type: 'listen-trigger', label: 'Listen Trigger', desc: 'Pause and wait for user input' },
];
const coreNodes = [
  { type: 'text', label: 'Text', desc: 'Send a message, optionally capture reply' },
  { type: 'conditional', label: 'Conditional', desc: 'Branch based on variable value' },
  { type: 'send-attachment', label: 'Send Attachment', desc: 'Send a file or document to the user' },
];
const agenticNodes = [
  { type: 'router-agent', label: 'Router Agent', desc: 'AI picks which path to follow' },
  { type: 'tool-agent', label: 'Tool Agent', desc: 'AI decides which tools to call' },
];
const endNodes = [
  { type: 'agent-handover', label: 'Agent Handover', desc: 'Transfer to human agent' },
  { type: 'end-session', label: 'End Session', desc: 'End the conversation' },
];

const nodeColor = type => {
  const m = {
    text: 'blue',
    conditional: 'orange',
    'router-agent': 'magenta',
    'tool-agent': 'purple',
    'agent-handover': 'red',
    'end-session': 'default',
    trigger: 'green',
    'listen-trigger': 'cyan',
    'send-attachment': 'geekblue',
  };
  return m[type] || 'default';
};

const toolLabels = {
  rag_search: 'Search KB',
  rag_list_documents: 'List KB Docs',
  generate_refund_pdf: 'Generate Refund PDF',
  openweather_get_weather: 'Get Weather',
  openweather_get_forecast: 'Get Forecast',
};
const toolLabel = name => toolLabels[name] || name;

const setToolOutputMapping = (toolName, field, value) => {
  if (!nodeConfig.toolOutputMapping) nodeConfig.toolOutputMapping = {};
  if (!nodeConfig.toolOutputMapping[toolName]) nodeConfig.toolOutputMapping[toolName] = {};
  if (value) {
    nodeConfig.toolOutputMapping[toolName][field] = value;
  } else {
    delete nodeConfig.toolOutputMapping[toolName][field];
    if (Object.keys(nodeConfig.toolOutputMapping[toolName]).length === 0) {
      delete nodeConfig.toolOutputMapping[toolName];
    }
  }
};

const kebabCaseRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const validateLabel = () => {
  const val = nodeConfig.label || '';
  if (val && !kebabCaseRe.test(val)) {
    labelError.value = 'Must be kebab-case (e.g. refund-flow)';
  } else {
    labelError.value = '';
  }
};

const getOutgoingEdges = nodeId => {
  return elements.value.filter(e => e.source === nodeId && e.target);
};

const defaultInput = type => {
  const base = { label: '', description: '' };
  if (type === 'conditional')
    return { ...base, conditionals: [{ variable: null, operator: null, matches: null, and: [] }] };
  if (type === 'text')
    return { ...base, messageSource: 'text', message: '', captureData: false, stored_to: 'last_message' };
  if (type === 'router-agent') return { ...base, systemPrompt: '' };
  if (type === 'tool-agent')
    return {
      ...base,
      systemPrompt: '',
      assignedTools: [],
      stored_to: '',
      multipleVariables: false,
      toolOutputMapping: {},
    };
  if (type === 'agent-handover') return { ...base, message: 'Transferring to human agent...' };
  if (type === 'send-attachment') return { ...base, filePathVar: 'filePath', caption: '' };
  return base;
};

const onDragStart = (event, nodeType) => {
  event.dataTransfer.setData('application/vueflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const onDrop = event => {
  const type = event.dataTransfer.getData('application/vueflow');
  if (!type) return;
  const id = nextId();
  elements.value.push({
    id,
    type,
    position: { x: event.offsetX, y: event.offsetY },
    data: { label: type, input: defaultInput(type) },
  });
};

const onConnect = connection => {
  elements.value.push({
    id: `e-${connection.source}-${connection.target}-${connection.sourceHandle || 'def'}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    type: 'straight',
    markerEnd: { type: 'arrowclosed' },
  });
};

const onNodeClick = ({ node }) => {
  selectedNode.value = node;
  store.updateSelectedNode(node);
  // Clear old config, then assign new values with defaults
  for (const key of Object.keys(nodeConfig)) delete nodeConfig[key];
  const input = { label: '', description: '', ...(node.data?.input || {}) };
  Object.assign(nodeConfig, input);
  labelError.value = '';
};

watch(
  nodeConfig,
  v => {
    if (selectedNode.value) {
      selectedNode.value.data.input = { ...v };
      if (selectedNode.value.type === 'router-agent' && v.edgesRaw !== undefined) {
        selectedNode.value.data.input.edges = v.edgesRaw
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const [name, desc] = line.split('|');
            return { name: (name || '').trim(), description: (desc || '').trim() };
          });
      }
    }
  },
  { deep: true },
);

const deselect = () => {
  selectedNode.value = null;
  store.updateSelectedNode(null);
};

const deleteSelected = () => {
  if (!selectedNode.value) return;
  const id = selectedNode.value.id;
  elements.value = elements.value.filter(e => e.id !== id && e.source !== id && e.target !== id);
  deselect();
};

const buildFlow = () => {
  const nodes = elements.value
    .filter(e => e.position)
    .map(n => {
      const input = { ...n.data.input };
      delete input.edgesRaw;
      return { id: n.id, type: n.type, position: n.position, data: { input } };
    });
  const edges = elements.value
    .filter(e => e.source && e.target)
    .map(e => ({
      source: e.source,
      target: e.target,
      label: e.sourceHandle || undefined,
    }));
  return { nodes, edges };
};

const save = async () => {
  saving.value = true;
  try {
    const flow = buildFlow();
    const payload = { name: graphName.value, flow, status: graphStatus.value };
    if (isNew) {
      const rv = await http.post('http://127.0.0.1:3101/api/sample-botbuilder/graph/configs', payload);
      message.success(`Saved! ID: ${rv.data?.config?.id}`);
      router.push('/botbuilder/list');
    } else {
      await http.put(`http://127.0.0.1:3101/api/sample-botbuilder/graph/configs/${botId}`, payload);
      message.success('Updated');
    }
  } catch (e) {
    message.error(e?.data?.error || 'Failed');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  // Fetch tool output schemas
  try {
    const schemaRv = await http.get('http://127.0.0.1:3101/api/sample-botbuilder/tools/output-schemas');
    if (schemaRv.data?.schemas) toolOutputSchemas.value = schemaRv.data.schemas;
  } catch {}

  if (!isNew) {
    try {
      const rv = await http.get(`http://127.0.0.1:3101/api/sample-botbuilder/graph/configs/${botId}`);
      const config = rv.data?.config;
      if (config) {
        graphName.value = config.name;
        graphStatus.value = config.status;
        const flow = config.flow;
        if (flow?.nodes) {
          flow.nodes.forEach(n => {
            idCounter = Math.max(idCounter, parseInt((n.id || '').slice(1)) || 0);
            elements.value.push({
              id: n.id,
              type: n.type,
              position: n.position || { x: 100, y: 100 },
              data: { label: n.type, input: n.data?.input || defaultInput(n.type) },
            });
          });
        }
        if (flow?.edges) {
          for (const e of flow.edges) {
            elements.value.push({
              id: `e-${e.source}-${e.target}-${e.label || 'def'}`,
              source: e.source,
              target: e.target,
              sourceHandle: e.label,
              type: 'straight',
              markerEnd: { type: 'arrowclosed' },
            });
          }
        }
      }
    } catch {}
  }
  await nextTick();
  mounted.value = true;
});
</script>
