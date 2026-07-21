import { reactive } from 'vue';

const state = reactive({
  selectedNode: null,
});

export const useBotBuilderStore = () => ({
  get selectedNode() {
    return state.selectedNode;
  },
  set selectedNode(v) {
    state.selectedNode = v;
  },
  updateSelectedNode(node) {
    state.selectedNode = node;
  },
});
