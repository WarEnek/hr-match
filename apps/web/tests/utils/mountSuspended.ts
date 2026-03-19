import { flushPromises, mount, type MountingOptions } from "@vue/test-utils";
import { Suspense, defineComponent, h, type Component } from "vue";

interface SuspendedMountOptions {
  props?: Record<string, unknown>;
  global?: MountingOptions<Record<string, never>>["global"];
}

export async function mountSuspended(component: Component, options: SuspendedMountOptions = {}) {
  const { props = {}, global } = options;
  const rootComponent = defineComponent({
    render() {
      return h(Suspense, null, {
        default: () => h(component, props),
      });
    },
  });

  const wrapper = mount(rootComponent, { global });

  await flushPromises();

  return wrapper;
}
