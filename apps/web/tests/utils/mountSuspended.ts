import { flushPromises, mount, type MountingOptions } from "@vue/test-utils";
import { Suspense, defineComponent, h, type Component } from "vue";

export async function mountSuspended(component: Component, options: MountingOptions<any> = {}) {
  const rootComponent = defineComponent({
    render() {
      return h(Suspense, null, {
        default: () => h(component, options.props || {}),
      });
    },
  });

  const wrapper = mount(
    rootComponent as any,
    {
      ...(options as any),
      props: undefined,
    } as any,
  );

  await flushPromises();

  return wrapper;
}
