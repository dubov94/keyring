import { EnhancedStore } from '@reduxjs/toolkit'
import { container } from 'tsyringe'
import { RootState } from './conjunction'

export const REDUX_TOKEN = 'Redux'

export const getRedux = () => container.resolve<EnhancedStore<RootState>>(REDUX_TOKEN)
