"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { tasks, type Task } from "@/db/schema"
import { faker } from "@faker-js/faker"
import { eq } from "drizzle-orm"
import { customAlphabet } from "nanoid"
import type { z } from "zod"

import type {
  updateTaskLabelSchema,
  updateTaskPrioritySchema,
  updateTaskStatusSchema,
} from "@/lib/validations/task"

export async function generateTasks({
  count = 100,
  reset = false,
}: {
  count?: number
  reset?: boolean
}) {
  const allTasks: Task[] = []

  for (let i = 0; i < count; i++) {
    allTasks.push({
      id:
        Number(customAlphabet("1234567890", 18)()) +
        new Date().getTime() +
        new Date().getMilliseconds() +
        new Date().getSeconds() +
        1,
      code: `TASK-${faker.number.int({ min: 1000, max: 9999 })}`,
      title: faker.hacker
        .phrase()
        .replace(/^./, (letter) => letter.toUpperCase()),
      status:
        faker.helpers.shuffle<Task["status"]>(tasks.status.enumValues)[0] ??
        "todo",
      label:
        faker.helpers.shuffle<Task["label"]>(tasks.label.enumValues)[0] ??
        "bug",
      priority:
        faker.helpers.shuffle<Task["priority"]>(tasks.priority.enumValues)[0] ??
        "low",
    })
  }

  reset && (await db.delete(tasks))

  console.log("📝 Inserting tasks", allTasks.length)

  await db.insert(tasks).values(allTasks)
}

export async function updateTaskLabel({
  id,
  label,
}: z.infer<typeof updateTaskLabelSchema>) {
  await db.update(tasks).set({ label }).where(eq(tasks.id, id))

  revalidatePath("/")
}

export async function updateTaskStatus({
  id,
  status,
}: z.infer<typeof updateTaskStatusSchema>) {
  console.log("updateTaskStatusAction", id, status)

  await db.update(tasks).set({ status }).where(eq(tasks.id, id))

  revalidatePath("/")
}

export async function updateTaskPriority({
  id,
  priority,
}: z.infer<typeof updateTaskPrioritySchema>) {
  console.log("updatePriorityAction", id, priority)

  await db.update(tasks).set({ priority }).where(eq(tasks.id, id))

  revalidatePath("/")
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id))

  // Create a new task for the deleted one
  await generateTasks({ count: 1 })

  revalidatePath("/")
}
