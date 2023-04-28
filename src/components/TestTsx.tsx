const Child = defineComponent({
  setup(props, { slots }) {
    return () => (
      <>
        <div>默认插槽：{slots.default?.()}</div>
        <div>具名插槽：{slots.prefix?.()}</div>
      </>
    );
  },
});
export default defineComponent({
  emits: ["testEmit"],
  setup(props, { emit }) {
    return () => (
      <>
        <Child v-slots={{ default: () => "default", prefix: () => <i>prefix</i> }}></Child>
        <button
          onClick={() => {
            emit("testEmit");
          }}
        >
          触发emit
        </button>
      </>
    );
  },
});
