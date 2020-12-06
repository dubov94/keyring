import { withPayloadType } from '@/redux/actions';
import { createAction } from "@reduxjs/toolkit";

export const setUsername = createAction('session/setUsername', withPayloadType<string | null>())
export const rehydrate = createAction('session/rehydrate', withPayloadType<{ username: string | null }>())
