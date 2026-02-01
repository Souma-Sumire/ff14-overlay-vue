import { defineStore } from 'pinia'
import { DEFAULT_JOB_SORT_ORDER } from '@/resources/jobSortOrder'

const usePartySortStore = defineStore('partySort', {
  state: () => ({
    arr: useStorage('cactbotRuntime-sortArr', [...DEFAULT_JOB_SORT_ORDER]),
  }),
})

export { usePartySortStore }
