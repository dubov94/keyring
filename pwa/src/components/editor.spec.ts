// For `tsyringe`.
import 'reflect-metadata'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from './testing'
import Editor from './Editor.vue'
import { expect } from 'chai'
import { create, delete_, emplace, update } from '@/redux/modules/user/keys/actions'
import YesNoDialog from './YesNoDialog.vue'
import { container } from 'tsyringe'
import { Color, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'

describe('Editor', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let $actions: Subject<RootAction>

  beforeEach(() => {
    container.register<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN, {
      useValue: {
        score () {
          return { value: 0, color: Color.GREEN }
        }
      }
    })
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    $actions = new Subject()
  })

  const setUpWrapper = (identifier: string | null, reveal: boolean) => mount(Editor, {
    vuetify: setUpVuetify(),
    localVue: setUpLocalVue(),
    stubs: {
      'v-dialog': true,
      draggable: true,
      'yes-no-dialog': true
    },
    propsData: {
      params: { identifier, reveal }
    },
    data () {
      return {
        $actions,
        $destruction: EMPTY
      }
    },
    mixins: [
      setUpStateMixin(store, actionQueue)
    ]
  })

  const getPasswordInput = (wrapper: Wrapper<Vue>) => wrapper.find('input[type="password"]')
  const getAllBadges = (wrapper: Wrapper<Vue>) => wrapper.findAll('.badge__input')
  const getAddBadgeButton = (wrapper: Wrapper<Vue>) => wrapper.findAll('button').filter(
    (button) => button.text().includes('Label')).at(0)
  const getSaveButton = (wrapper: Wrapper<Vue>) => wrapper.findAll('button').filter(
    (button) => button.text().includes('Save')).at(0)
  const getRemoveButton = (wrapper: Wrapper<Vue>) => wrapper.findAll('button').filter(
    (button) => button.text().includes('Remove')).at(0)
  const getRemovalConfirmationDialog = (wrapper: Wrapper<Vue>) => wrapper.findAllComponents(YesNoDialog).filter(
    (component) => component.props().message === 'Are you sure?').at(0)
  const getCancelButton = (wrapper: Wrapper<Vue>) => wrapper.findAll('button').filter(
    (button) => button.text().includes('Cancel'))
  const getCancellationConfirmationDialog = (wrapper: Wrapper<Vue>) => wrapper.findAllComponents(YesNoDialog).filter(
    (component) => component.props().message === 'Discard changes?').at(0)

  it('dispatches creation action', async () => {
    const wrapper = setUpWrapper(null, false)
    await getPasswordInput(wrapper).setValue('password')
    await getAllBadges(wrapper).at(0).setValue('tag')
    await getSaveButton(wrapper).trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      create({
        value: 'password',
        tags: ['tag']
      })
    ])
  })

  it('dispatches updation action', async () => {
    store.dispatch(emplace([
      { identifier: 'identifier', value: 'value', tags: ['x'] }
    ]))
    const wrapper = setUpWrapper('identifier', false)
    await getAddBadgeButton(wrapper).trigger('click')
    await getAllBadges(wrapper).at(1).setValue('y')
    await getSaveButton(wrapper).trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      update({
        identifier: 'identifier',
        value: 'value',
        tags: ['x', 'y']
      })
    ])
  })

  it('dispatches deletion action', async () => {
    store.dispatch(emplace([
      { identifier: 'identifier', value: 'value', tags: [] }
    ]))
    const wrapper = setUpWrapper('identifier', false)
    await getRemoveButton(wrapper).trigger('click')
    getRemovalConfirmationDialog(wrapper).vm.$emit('affirm')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      delete_('identifier')
    ])
  })

  it('closes on cancellation affirmation', async () => {
    store.dispatch(emplace([
      { identifier: 'identifier', value: 'value', tags: [] }
    ]))
    const wrapper = setUpWrapper('identifier', false)
    await getPasswordInput(wrapper).setValue('random')
    await getCancelButton(wrapper).trigger('click')
    getCancellationConfirmationDialog(wrapper).vm.$emit('affirm')

    expect(wrapper.emitted().close![0]).to.deep.equal([])
  })
})
