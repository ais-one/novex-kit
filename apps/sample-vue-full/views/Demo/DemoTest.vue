<template>
  <div class="container">
    <h1>Site A - Test VueJS 3</h1>
    <!-- <div v-for="(item, i) in list" :key="i" :ref="(el) => { divs[i] = el }"> -->
    <!-- <div v-for="(item, i) in list" :key="i" :ref="(el) => makeRef(el, i)"> -->
    <div v-for="(item, i) in list" :key="i" :ref="(el) => (divs[i] = el)">{{ item }}</div>
    <div class="section">
      <div class="box" style="background-color: red">A</div>
      <div class="box" style="background-color: lightblue">B</div>
      <div class="box" style="background-color: yellow">C</div>
      <div class="box" style="background-color: brown">D</div>
      <div class="box" style="background-color: lightgreen">E</div>
      <div class="box" style="background-color: red">A</div>
      <div class="box" style="background-color: brown">G</div>
    </div>

    <p><button type="button" @click="router.push('/dun-no-what-is-this')">Go an unknown route</button></p>
    <p>
      <span>Count is: {{ count }}</span>
      <button type="button" @click="count++">increment</button>
    </p>
    <p>
      <span>Mock Service Worder Test</span>
      <button type="button" @click="callMsw">Call MSW Endpoint</button>
    </p>
    <p>
      <button type="button" @click="(e) => testApi('healthcheck')">Test Liveness</button>
      <button type="button" @click="(e) => testApi('check-db')">Test Readiness</button>
    </p>
    <p>Non-Reactive Data: {{ nonReactiveData }}</p>
    <p>Reactive Data: {{ reactiveData }}</p>
    <p>
      Vuex Store: {{ store.user }}
      <button type="button" @click="(e) => store.updateUser({ id: 'AnewId' })">Change Name</button>
    </p>
    <h2>Test Reactivity In Object</h2>
    <p>
      Click to see increment. Also check console.log if onUpdated is called
      <button type="button" @click="() => testObjectRef.a++">Test Object Ref = {{ testObjectRef.a }}</button>
      <button type="button" @click="() => testObjectReactive.a.xx++">
        Test Object Reactive = {{ testObjectReactive.a.xx }}
      </button>
    </p>
    <ul>
      <li v-for="n in 10" :key="n">{{ n }}</li>
    </ul>
  </div>
</template>

<script setup>
import { http } from '@common/vue/plugins/fetch.js';
// NOSONAR unref, toRef, toRefs, isRef, isProxy, isReactive, isReadonly, defineComponent, getCurrentInstance, reactive, readonly, watch, watchEffect
import { onBeforeUnmount, onBeforeUpdate, onMounted, onUnmounted, onUpdated, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../../store.js';

const list = reactive([1, 2, 3]);
const divs = ref([]);
// const route = useRoute()
const router = useRouter();
// const obj = reactive({ count: 0 })
const store = useMainStore();
const count = ref(0);
let nonReactiveData = 10;
const reactiveData = ref(20);
const searchRef = ref(null);
const searchVal = ref('');
const searchResult = ref('');
const testObjectRef = ref({ a: 10, b: 20, c: 30 });
const testObjectReactive = reactive({ a: { xx: 40 }, b: 50, c: 60 });

// NOSONAR
// const plusOne = computed(() => count.value + 1)
// const stop = watchEffect(() => console.log(count.value))
// // -> logs 0
// setTimeout(() => {
//   count.value++
//   // -> logs 1
// }, 100)
// // stop()
//
// put watchEffect inside onMounted to have access to DOM
// // watching a getter
// const state = reactive({ count: 0 })
// watch(
//   () => state.count,
//   (count, prevCount) => {
//   }
// )
//
// // directly watching a ref
// const count = ref(0)
// watch(search, (newVal, prevVal) => {
//   console.log('watch search', newVal)
// })
//
// // Watch prop value change and assign to value 'selected' Ref
// watch(() => props.value, (newValue: Props['value']) => {
//   selected.value = newValue;
// });
//
// watch([fooRef, barRef], ([foo, bar], [prevFoo, prevBar]) => {
// })
//
// watch(
//   () => object_or_primitive_being_watched,
//   (state, prevState) => {
//     console.log(
//       "deep ",
//       state.attributes.name,
//       prevState.attributes.name
//     );
//   },
//   { deep: true }
// )
// watchEffect ... ?

// make sure to reset the refs before each update
onBeforeUpdate(() => {
  divs.value = [];
});
const makeRef = (el, i) => {
  divs[i] = el;
};
let timerId;
onMounted(async () => {
  console.log('demomain mounted!');
  // NOSONAR
  // console.log('props', props)
  // console.log('context', context)
  // console.log('useStore', store)
  // console.log('useRouter', router)
  // console.log('useRoute', route)

  timerId = setInterval(() => {
    console.log('timer fired');
    nonReactiveData += 1;
    reactiveData.value += 1;
  }, 200000);
});
onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId);
  // / console.log('demomain before unmount!')
});
onUpdated(() => console.log('demomain updated!'));
onUnmounted(() => console.log('demomain unmounted!'));

const testApi = async test => {
  try {
    const { data } = await http.get(`/api/${test}`);
    console.log('testApi', data);
  } catch (e) {
    console.log('testApi err', e);
  }
};

const callMsw = async test => {
  try {
    const { data } = await http.get('/api/msw/test');
    alert(`MSA returned: ${data.message.toString()}`);
  } catch (e) {
    console.log('callMsw err', e);
  }
};
</script>

<style lang="css" scoped>
.section {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: space-around;
}

.box {
  width: 200px;
  /* border: 3px solid rgba(0,0,0,.2); */
  /* flex: 1 0 21%; */
  /* width: 25%; */
  margin: 5px;
  height: 100px;
  background-color: blue;
}
</style>
