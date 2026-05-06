import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { CommandOutput, NameSpace } from '../../../tauri'
import { ScrollRef } from './console'

export enum CommandStatus {
    Running,
    Ok,
    Error
}

export type TaskResult =
    | {
          status: CommandStatus.Running
      }
    | {
          status: CommandStatus.Error
          message: string
      }
    | {
          status: CommandStatus.Ok
          data: CommandOutput
      }

export interface Task {
    id: number
    namespace: NameSpace
    command: string
    result: TaskResult
}

export const useTasks = (scrollRef: ScrollRef) => {
    const [tasks, setTasks] = useState<Task[]>([])
    const toBottom = useRef(true)

    useEffect(() => {
        if (toBottom.current) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            })
        }
    }, [tasks])

    return {
        tasks,

        resetTasks: () => {
            toBottom.current = false
            setTasks([])
        },

        pushTask: (task: Task) => {
            toBottom.current = true
            setTasks((prev) => [...prev, task])
        },

        updateTask: (id: number, result: TaskResult) => {
            toBottom.current =
                scrollRef.current !== null &&
                scrollRef.current.scrollHeight -
                    (scrollRef.current.scrollTop + scrollRef.current.clientHeight) <=
                    24
            setTasks((tasks) => {
                return tasks.map((task) => {
                    if (task.id === id) {
                        task = {
                            ...task,
                            result
                        }
                    }
                    return task
                })
            })
        }
    }
}

export const useInput = create<{
    input: string
    setInput: (input: string) => void
}>((set) => {
    return {
        input: '',
        setInput: (input: string) => set({ input })
    }
})

let idCounter = 0
export const nextID = () => {
    idCounter += 1
    return idCounter
}

class Historys {
    private historys: string[] = []
    private index: number = -1

    constructor() {}

    get inHistory(): boolean {
        return this.index !== -1
    }

    resetIndex(): void {
        this.index = -1
    }

    remove(item: string): void {
        const i = this.historys.indexOf(item)
        if (i >= 0) {
            this.historys.splice(i, 1)
        }
    }

    public insert(command: string): void {
        this.remove(command)
        this.historys.push(command)
        this.index = -1
    }

    public up(): string | null {
        if (this.historys.length === 0) {
            return null
        }
        if (this.index === -1) {
            this.index = this.historys.length - 1
        } else if (this.index > 0) {
            this.index -= 1
        }
        return this.historys[this.index]
    }

    public down(): string | null {
        if (this.historys.length === 0) {
            return null
        }
        if (this.index === -1) {
            return null
        }
        if (this.index + 1 < this.historys.length) {
            this.index += 1
            return this.historys[this.index]
        }
        this.index = -1
        return null
    }
}

export const historys = new Historys()
