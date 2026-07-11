import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import GameView from '../src/views/GameView.vue'

describe('GameView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('加载完成后进入战斗界面应显示怪物、按钮和属性', async () => {
    const wrapper = mount(GameView)
    await new Promise((r) => setTimeout(r, 100))
    await nextTick()
    await nextTick()
    const startBtn = wrapper.find('button')
    expect(startBtn.exists()).toBe(true)
    await startBtn.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.text()).toContain('立即战斗')
    expect(wrapper.text()).toContain('攻击')
    expect(wrapper.text()).toContain('暂无战斗记录')
  })
})
