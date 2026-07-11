import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import GameView from '../src/views/GameView.vue'

describe('GameView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('进入战斗界面后应显示按钮和属性', async () => {
    const wrapper = mount(GameView)
    // wait for init to finish
    await new Promise((r) => setTimeout(r, 100))
    await nextTick()
    await nextTick()
    const startBtn = wrapper.find('button')
    expect(startBtn.exists()).toBe(true)
    await startBtn.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('立即战斗')
    expect(wrapper.text()).toContain('战斗属性')
    expect(wrapper.text()).toContain('已装备')
    expect(wrapper.text()).toContain('暂无战斗记录')
  })
})
