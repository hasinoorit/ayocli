export const vueContent = `<script lang="ts" setup>
const props = defineProps({});
const emit = defineEmits([]);
</script>
<template></template>
`;

export const indexContent = (
  name: string
) => `import ${name} from "./${name}.vue";

export default ${name};
  `;

export const testContent = (
  name: string
) => `import { mount } from "@vue/test-utils";
import ${name} from "./${name}.vue";

describe("${name}.vue", () => {
  it("Should render", () => {
    const wrapper = mount(${name}, {});
    expect(wrapper.text()).toContain("");
  });
  it("Should be interactive", async () => {
    const wrapper = mount(${name}, {});
    await wrapper.setProps({});
    expect(wrapper.text()).toContain("");
  });
});
`;

export const metaContent = (
  name: string
) => `import type { AComponentMeta } from "../../utils/meta-types";
export const ${name}Meta: AComponentMeta = {
  name: "${name}",
};
`;
