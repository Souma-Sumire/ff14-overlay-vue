import { defineStore } from 'pinia'

const usePartySortStore = defineStore('partySort', {
  state: () => ({
    arr: useStorage('cactbotRuntime-sortArr', [21, 32, 37, 19, 24, 33, 40, 28, 34, 30, 39, 22, 20, 41, 23, 31, 38, 25, 27, 35, 42, 36] as number[]),
  }),
})

export { usePartySortStore }
