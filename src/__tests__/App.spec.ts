import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Grid Table Library')
  })
  
  it('renders GridTable component', () => {
    const wrapper = mount(App)
    expect(wrapper.findComponent({ name: 'GridTable' }).exists()).toBe(true)
  })
  
  it('displays demo data', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('5')
  })
})
